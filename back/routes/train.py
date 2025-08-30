import json
from fastapi import APIRouter, Depends, HTTPException, Form, File, Request, UploadFile, WebSocket, WebSocketDisconnect
from typing import List
from pydantic import BaseModel
from sklearn.calibration import LabelEncoder
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, Experiment, DatasetFile, Datasets, Iteration
from models.dataset_file import FileType, DatasetType
from schemas.experiment import ExperimentOut
from .auth import get_current_user_from_cookie
from datetime import datetime
from core.config import settings
import pandas as pd
import numpy as np
from dsmodels import classifier, DSParser
import asyncio
import threading
import inspect
from dsmodels.train import train_model
import dill

api_router = APIRouter()


# --------------------------
# Worker que procesa la cola
# --------------------------
def worker_loop():
    while True:
        func, args, task_id = settings.TASK_QUEUE.get()
        try:
            print(f"Starting task {task_id}")
            func(*args, tasks_id=task_id)
        except Exception as e:
            print(f"Error en worker: {e}")
        finally:
            settings.TASK_QUEUE.task_done()


# Lanzar los workers en threads separados
for _ in range(settings.MAX_WORKERS):
    t = threading.Thread(target=worker_loop, daemon=True)
    t.start()


class RuleParams(BaseModel):
    singleRule: bool = False
    multipleRule: bool = False
    breakRules: int = 3
    selectedColumns: List[str]

@api_router.post("/generate-rules/{experiment_id}")
def generate_rules(
    experiment_id: int,
    rule_params: RuleParams,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    selectedColumns = rule_params.selectedColumns
    breakRules = rule_params.breakRules
    singleRule = rule_params.singleRule
    multipleRule = rule_params.multipleRule
    print(multipleRule, singleRule, breakRules, selectedColumns)
    dataset_files = db.query(DatasetFile).join(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).all()
    if not dataset_files:
        raise HTTPException(status_code=404, detail="No dataset files found for this experiment")
    for dataset_file in dataset_files:
        if dataset_file.dataset_type == DatasetType.TESTING:
            continue
        if dataset_file.type_file == FileType.CSV:
            X = pd.read_csv(dataset_file.file_path, header=0 if dataset_file.header else None)
        elif dataset_file.type_file == FileType.EXCEL:
            X = pd.read_excel(dataset_file.file_path, header=0 if dataset_file.header else None)
        elif dataset_file.type_file == FileType.PARQUET:
            X = pd.read_parquet(dataset_file.file_path)
        else:
            return HTTPException(status_code=400, detail="Unsupported file type")
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    print("Selected columns:", selectedColumns)
    X.columns = X.columns.map(str)
    print("columns:", X.columns.tolist())
    #nos quedamos con selectedColumns
    X = X[selectedColumns]
    X_np = X.to_numpy()
    # Get the experiment from the database
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Generate rules using the DSParser
    ds_parser = DSParser.DSParser()
    cr = classifier.DSClassifierMultiQ(dataset.n_classes)
    if singleRule:
        cr.model.generate_statistic_single_rules(X_np, breakRules, selectedColumns)
    if multipleRule:
        cr.model.generate_mult_pair_rules(X_np, selectedColumns)
    rules = cr.model.preds
    masses = cr.model._params
    masses = [m.tolist() for m in masses]  # Convertir a float para JSON serializable
    #a las masas la squiero con solo 3 decimales
    for i in range(len(masses)):
        mass = masses[i]
        mass = [round(m, 3) for m in mass]
        masses[i] = mass

    print("Generated rules:", rules)
    print("Masses:", masses)
    encoded_rules = []
    for rule in rules:
        vars = rule.ld.__defaults__
        #pasamos los valores np.float a float
        vars = [float(v) if isinstance(v, np.float64) else v for v in vars]
        lambda_fn = ds_parser.lambda_rule_to_json(rule.ld, vars)
        encoded_rules.append(lambda_fn)
    for rule, vars in encoded_rules:
        keys = ds_parser.json_index(rule, vars)
        #elimina duplicados
        keys = list(set(keys))
        print("Rule keys:", keys)
        for key in keys:
            value = vars.get(key, None)
            vars[key] = selectedColumns[value] if value is not None and value < len(selectedColumns) else value
    return {"rules": encoded_rules, "masses": masses}


@api_router.post("/train-model/{experiment_id}")
async def train_model_post(
    experiment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    data = await request.json()
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset_files = db.query(DatasetFile).join(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).all()
    if not dataset_files:
        raise HTTPException(status_code=404, detail="No dataset files found for this experiment")
    datasets = []
    for dataset_file in dataset_files:
        if dataset_file.type_file == FileType.CSV:
            X = pd.read_csv(dataset_file.file_path, header=0 if dataset_file.header else None)
        elif dataset_file.type_file == FileType.EXCEL:
            X = pd.read_excel(dataset_file.file_path, header=0 if dataset_file.header else None)
        elif dataset_file.type_file == FileType.PARQUET:
            X = pd.read_parquet(dataset_file.file_path)
        else:
            return HTTPException(status_code=400, detail="Unsupported file type")
        datasets.append({
            "data": X,
            "header": dataset_file.header,
            "dataset_type": dataset_file.dataset_type
        })
    X = datasets[0]["data"]
    X.columns = X.columns.map(str)
    X = X[dataset.columns]
    drop_na = data.get("dropNulls", True)
    drop_duplicates = data.get("dropDuplicates", True)
    if drop_na:
        X = X.dropna()
    if drop_duplicates:
        X = X.drop_duplicates()
    y = X[dataset.target_column]
    #pasar y a numeros
    l = LabelEncoder()
    y = l.fit_transform(y)
    label_to_num = {label: idx for idx, label in enumerate(l.classes_)}
    X = X.drop(columns=[dataset.target_column])
    test_size = data.get("testSize", 0.2)
    split_seed = data.get("splitSeed", 42)
    shuffle = data.get("shuffle", True)
    max_epochs = data.get("maxEpochs", 100)
    min_epochs = data.get("minEpochs", 10)
    batch_size = data.get("batchSize", 4000)
    loss_function = data.get("lossFunction", "MSE").upper()
    optim_function = data.get("optimFunction", "adam").lower()
    learning_rate = data.get("learningRate", 0.001)
    rules = data.get("rules", [])
    if len(rules) == 0:
        return HTTPException(status_code=404, detail="No rules provided for training")
    
    dsparser = DSParser.DSParser()
    functions = []
    for i in range(len(rules)):
        f = dsparser.json_to_lambda(rules[i], X.columns.tolist())
        functions.append(f)

    iteration = Iteration(
        created_at=datetime.now(),
        experiment_id=experiment_id,
        trained = False,
        model_path = "",
        train_test_split = test_size,
        train_test_split_seed = split_seed,
        delete_nulls = drop_na,
        drop_duplicates = drop_duplicates,
        min_epochs = min_epochs,
        max_epochs = max_epochs,
        batch_size = batch_size,
        loss_function = loss_function,
        optimizer = optim_function,
        learning_rate = learning_rate,
        training_status = "pending",
    )
    db.add(iteration)
    db.commit()
    db.refresh(iteration)
    task_id = str(iteration.id)
    # Encolar el entrenamiento
    settings.TASK_QUEUE.put((train_model, (
        X,
        y,
        test_size,
        split_seed,
        shuffle,
        max_epochs,
        min_epochs,
        batch_size,
        loss_function,
        optim_function,
        learning_rate,
        functions, #funciones de las reglas
        dataset.n_classes,
        label_to_num,
    ), task_id))
    return {"task_id": task_id, "status": "Task enqueued"}



@api_router.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        while True:
            # Enviar estado actual
            status = settings.TASKS_PROGRESS.get(task_id, "Task not found or finished")
            await websocket.send_text(status)
            if status.startswith("Training finished") or status.startswith("Error"):
                break
            await asyncio.sleep(1)
        await websocket.close() 
    except WebSocketDisconnect:
        print(f"Cliente desconectado: {task_id}")