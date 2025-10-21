import json
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from sklearn.calibration import LabelEncoder
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session 
from utils.sanitize import sanitize_json
from database import get_db
from models import User, Experiment, DatasetFile, Datasets, Iteration
from models.dataset_file import DatasetType
from models.iteration import Status
from .auth import get_current_user_from_cookie
from datetime import datetime
from core.config import settings
import asyncio
import threading
from dsmodels.train import train_model
from utils.loadDataset import load_datasets

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
    datasets = load_datasets(dataset_files)
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
        X = X.drop(columns=[dataset.target_column])
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X.columns:
                X[key] = X[key].replace(column_encoder)
            if key == dataset.target_column:
                y = y.replace(column_encoder)
                label_to_num = {label: num for label, num in column_encoder.items()}
        
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
        X_train = X_train.drop(columns=[dataset.target_column])
        X_test = X_test.drop(columns=[dataset.target_column])
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X_test.columns:
                X_test[key] = X_test[key].replace(column_encoder)
                X_train[key] = X_train[key].replace(column_encoder)
            if key == dataset.target_column:
                y_test = y_test.replace(column_encoder)
                y_train = y_train.replace(column_encoder)
                label_to_num = {label: num for label, num in column_encoder.items()}
    else:
        return HTTPException(status_code=400, detail="More than 2 dataset files found")
    
    if not label_to_num:
        label_to_num = {str(label): label for label in y_train.unique()}
    max_epochs = data.get("maxEpochs", 100)
    min_epochs = data.get("minEpochs", 10)
    batch_size = data.get("batchSize", 4000)
    loss_function = data.get("lossFunction", "MSE").upper()
    optim_function = data.get("optimFunction", "adam").lower()
    learning_rate = data.get("learningRate", 0.001)
    min_dloss = data.get("minDloss", 0.0001)
    rules = data.get("rules", [])
    masses = data.get("masses", [])
    labels = data.get("labels", [])
    if len(rules) == 0:
        raise HTTPException(status_code=404, detail="No rules provided for training")
    if len(rules) != len(masses) or len(rules) != len(labels) or len(masses) != len(labels):
        raise HTTPException(status_code=404, detail="The rules are bad")
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
        min_dloss = min_dloss,
        training_status = Status.PENDING,
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
        min_dloss,
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
                    iteration.training_status = Status.ERROR
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