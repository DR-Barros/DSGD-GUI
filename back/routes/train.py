import json
from fastapi import APIRouter, Depends, HTTPException, Form, File, Request, UploadFile, WebSocket, WebSocketDisconnect
from typing import List
from pydantic import BaseModel
from sklearn.calibration import LabelEncoder
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session 
from utils.sanitize import sanitize_json
from database import get_db
from models import User, Experiment, DatasetFile, Datasets, Iteration
from models.dataset_file import FileType, DatasetType
from .auth import get_current_user_from_cookie
from datetime import datetime
from core.config import settings
import pandas as pd
import numpy as np
from dsmodels import classifier, DSParser
import asyncio
import threading
from dsmodels.train import train_model

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
    try:
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
        columnEncoder = dataset.columns_encoder # dict para pasar las columnas categoricas a numeros
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        print("Selected columns:", selectedColumns)
        X.columns = X.columns.map(str)
        #nos quedamos con selectedColumns
        X = X[selectedColumns]
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X.columns:
                X[key] = X[key].replace(column_encoder)
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
        #redondear masses a 3 decimales
        for i in range(len(masses)):
            mass = masses[i]
            mass = [round(m, 3) for m in mass]
            # la ultima masa se ajusta para que todas sumen 1
            mass[-1] = round(1 - sum(mass[:-1]), 3)
            masses[i] = mass

        encoded_rules = []
        labels = []
        for rule in rules:
            vars = rule.ld.__defaults__
            #pasamos los valores np.float a float
            vars = [float(v) if isinstance(v, np.float64) else v for v in vars]
            lambda_fn = ds_parser.lambda_rule_to_json(rule.ld, vars)
            encoded_rules.append(lambda_fn)
            labels.append(rule.caption)
        for rule, vars in encoded_rules:
            keys = ds_parser.json_index(rule, vars)
            #elimina duplicados
            keys = list(set(keys))
            for key in keys:
                value = vars.get(key, None)
                vars[key] = selectedColumns[value] if value is not None and value < len(selectedColumns) else value
        return sanitize_json({"rules": encoded_rules, "masses": masses, "labels": labels, "columnsEncoder": columnEncoder})
    except Exception as e:
        print("Error generating rules:", e)
        raise HTTPException(status_code=500, detail="Error generating rules")
    

@api_router.post("/coverage-rule/{experiment_id}")
def coverage_rules(
    experiment_id: int,
    rule: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    try:
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
        columnEncoder = dataset.columns_encoder # dict para pasar las columnas categoricas a numeros
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        #aplicamos columnEncoder
        for key, column_encoder in columnEncoder.items():
            if key in X.columns:
                X[key] = X[key].replace(column_encoder)
        ds_parser = DSParser.DSParser()
        fn = ds_parser.json_to_lambda(rule["rule"], X.columns.tolist())
        print("Evaluating coverage with function:", fn)
        #calculamos el numero de filas que cumplen la regla
        coverage = X.apply(fn, axis=1).sum()
        return {"coverage": int(coverage), "total": len(X), "percentage": round(coverage / len(X) * 100, 2)}
    except Exception as e:
        print("Error calculating coverage:", e)
        raise HTTPException(status_code=500, detail="Error calculating coverage")


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
    drop_na = data.get("dropNulls", True)
    drop_duplicates = data.get("dropDuplicates", True)
    test_size = data.get("testSize", 0.2)
    split_seed = data.get("splitSeed", 42)
    shuffle = data.get("shuffle", True)
    if len(datasets) == 1:
        X = datasets[0]["data"]
        X.columns = X.columns.map(str)
        X = X[dataset.columns]
        if drop_na:
            X = X.dropna()
        if drop_duplicates:
            X = X.drop_duplicates()
        y = X[dataset.target_column]
        #pasar y a numeros
        l = LabelEncoder()
        y = l.fit_transform(y)
        X = X.drop(columns=[dataset.target_column])
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X.columns:
                X[key] = X[key].replace(column_encoder)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=split_seed, shuffle=shuffle)
    elif len(datasets) == 2:
        X_train = datasets[0]["data"] if datasets[0]["dataset_type"] == DatasetType.TRAINING else datasets[1]["data"]
        X_test = datasets[1]["data"] if datasets[0]["dataset_type"] == DatasetType.TRAINING else datasets[0]["data"]
        X_train.columns = X_train.columns.map(str)
        X_test.columns = X_test.columns.map(str)
        if drop_na:
            X_train = X_train.dropna()
            X_test = X_test.dropna()
        if drop_duplicates:
            X_train = X_train.drop_duplicates()
            X_test = X_test.drop_duplicates()
        y_train = X_train[dataset.target_column]
        y_test = X_test[dataset.target_column]
        #pasar y a numeros
        l = LabelEncoder()
        y_train = l.fit_transform(y_train)
        y_test = l.transform(y_test)
        X_train = X_train.drop(columns=[dataset.target_column])
        X_test = X_test.drop(columns=[dataset.target_column])
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X_train.columns:
                X_train[key] = X_train[key].replace(column_encoder)
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X_test.columns:
                X_test[key] = X_test[key].replace(column_encoder)
    else:
        return HTTPException(status_code=400, detail="More than 2 dataset files found")
    
    label_to_num = {label: idx for idx, label in enumerate(l.classes_)}
    max_epochs = data.get("maxEpochs", 100)
    min_epochs = data.get("minEpochs", 10)
    batch_size = data.get("batchSize", 4000)
    loss_function = data.get("lossFunction", "MSE").upper()
    optim_function = data.get("optimFunction", "adam").lower()
    learning_rate = data.get("learningRate", 0.001)
    rules = data.get("rules", [])
    masses = data.get("masses", [])
    labels = data.get("labels", [])
    if len(rules) == 0:
        return HTTPException(status_code=404, detail="No rules provided for training")
    if len(rules) != len(masses) != len(labels):
        return HTTPException(status_code=404, detail="The rules are bad")
    rules = zip(rules, masses, labels)
    
    iteration = Iteration(
        created_at=datetime.now(),
        experiment_id=experiment_id,
        trained = False,
        model_path = "",
        train_test_split = test_size,
        train_test_split_seed = split_seed,
        shuffle = shuffle,
        delete_nulls = drop_na,
        drop_duplicates = drop_duplicates,
        min_epochs = min_epochs,
        max_epochs = max_epochs,
        batch_size = batch_size,
        loss_function = loss_function,
        optimizer = optim_function,
        learning_rate = learning_rate,
        training_status = "pending",
        label_encoder = sanitize_json(label_to_num)
    )
    db.add(iteration)
    db.commit()
    db.refresh(iteration)
    task_id = str(iteration.id)
    # Encolar el entrenamiento
    settings.TASK_QUEUE.put((train_model, (
        X_train,
        X_test,
        y_train,
        y_test,
        max_epochs,
        min_epochs,
        batch_size,
        loss_function,
        optim_function,
        learning_rate,
        rules,
        dataset.n_classes,
        label_to_num,
        db,
    ), task_id))
    settings.TASKS_PROGRESS[task_id] = json.dumps({
        "epoch": 0,
        "loss": 0,
        "max": max_epochs,
        "status": "Task enqueued",
        "time": 0,
        "eta": 0
        })
    return {"task_id": task_id, "status": "Task enqueued"}



@api_router.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                if data == "stop":
                    data = {
                        "status": "Training stopped by user"
                    }
                    settings.TASKS_PROGRESS[task_id] = json.dumps(data)
            except asyncio.TimeoutError:
                pass
            # Enviar estado actual
            status = settings.TASKS_PROGRESS.get(task_id, "Task not found or finished")
            #manejar caso en que no haya estado y task queue este vacia
            if status == "Task not found or finished" and settings.TASK_QUEUE.empty():
                status = "Error: Task not found"
                #actualizamos el estado en la base de datos
                iteration = db.query(Iteration).filter(Iteration.id == int(task_id)).first()
                if iteration:
                    iteration.training_status = "error"
                    iteration.training_end_time = datetime.now()
                    iteration.training_message = status
                    db.commit()
            await websocket.send_text(status)
            if status.startswith("Training finished") or status.startswith("Error"):
                if task_id in settings.TASKS_PROGRESS:
                    del settings.TASKS_PROGRESS[task_id]
                break
            await asyncio.sleep(1)
        await websocket.close() 
    except WebSocketDisconnect:
        print(f"Cliente desconectado: {task_id}")


@api_router.get("/iteration/{iteration_id}")
async def get_iteration_data(
    iteration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    iteration = db.query(Iteration).filter(Iteration.id == iteration_id).first()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")
    return iteration


@api_router.get("/get-rules/{experiment_id}/{iteration_id}")
async def get_rules(
    experiment_id: int,
    iteration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    iteration = db.query(Iteration).filter(Iteration.id == iteration_id, Iteration.experiment_id == experiment_id).first()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    ds_parser = DSParser.DSParser()
    cr = classifier.DSClassifierMultiQ(dataset.n_classes)
    cr.model.load_rules_bin(iteration.model_path)
    columns = [x for x in dataset.columns if x != dataset.target_column]
    rules = cr.model.preds
    masses = cr.model._params
    masses = [m.tolist() for m in masses]  # Convertir a float para JSON serializable
    #redondear masses a 3 decimales
    for i in range(len(masses)):
        mass = masses[i]
        mass = [round(m, 3) for m in mass]
        # la ultima masa se ajusta para que todas sumen 1
        mass[-1] = round(1 - sum(mass[:-1]), 3)
        masses[i] = mass

    encoded_rules = []
    labels = []
    for rule in rules:
        vars = rule.ld.__defaults__
        #pasamos los valores np.float a float
        print("Vars before:", vars)
        if vars is not None:
            vars = [float(v) if isinstance(v, np.float64) else v for v in vars]
        lambda_fn = ds_parser.lambda_rule_to_json(rule.ld, vars)
        encoded_rules.append(lambda_fn)
        labels.append(rule.caption)
    for rule, vars in encoded_rules:
        keys = ds_parser.json_index(rule, vars)
        #elimina duplicados
        keys = list(set(keys))
        for key in keys:
            value = vars.get(key, None)
            vars[key] = columns[value] if value is not None and value < len(columns) else value
    return sanitize_json({
        "rules": encoded_rules, 
        "masses": masses, 
        "labels": labels,
        "params": {
            "minEpochs": iteration.min_epochs,
            "maxEpochs": iteration.max_epochs,
            "batchSize": iteration.batch_size,
            "lossFunction": iteration.loss_function,
            "optimFunction": iteration.optimizer,
            "learningRate": iteration.learning_rate,
            "testSize": iteration.train_test_split,
            "splitSeed": iteration.train_test_split_seed,
            "dropDuplicates": iteration.drop_duplicates,
            "dropNulls": iteration.delete_nulls,
            "shuffle": True
        }
    })
    
    