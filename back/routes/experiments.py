import json
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from typing import List
import zipfile
import io
from fastapi.responses import StreamingResponse
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session, joinedload
from utils.sanitize import sanitize_json
from database import get_db
from models import User, Experiment, DatasetFile, Datasets, Iteration
from models.dataset_file import FileType, DatasetType
from models.iteration import Status
from schemas.experiment import ExperimentOut
from .auth import get_current_user_from_cookie
from datetime import datetime
from dsmodels import classifier, DSParser
from core.config import settings
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, classification_report, roc_auc_score
import os


api_router = APIRouter()
@api_router.post("/")
async def create_experiment(
    dataset_id: int = Form(...),
    name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    new_experiment = Experiment(
        dataset_id=dataset_id,
        name=name,
        user_id=current_user.id,
        created_at=datetime.now()
    )
    db.add(new_experiment)
    db.commit()
    db.refresh(new_experiment)
    return new_experiment


@api_router.get("/", response_model=List[ExperimentOut])
async def get_experiments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    experiments = db.query(Experiment).filter(Experiment.user_id == current_user.id).options(joinedload(Experiment.datasets)).order_by(Experiment.created_at.desc()).all()
    return experiments

@api_router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    iterations = db.query(Iteration).filter(Iteration.experiment_id == experiment_id).all()
    for iteration in iterations:
        if os.path.exists(iteration.model_path):
            os.remove(iteration.model_path)
        db.delete(iteration)
    db.delete(experiment)
    db.commit()
    return {"detail": "Experiment deleted"}


@api_router.get("/dataset/{experiment_id}")
async def get_experiment_dataset(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    dataset_files = db.query(DatasetFile).join(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).all()
    if not dataset_files:
        raise HTTPException(status_code=404, detail="No dataset files found for this experiment")
    dataset_data = []
    for dataset_file in dataset_files:
        if dataset_file.type_file == FileType.CSV:
            df = pd.read_csv(dataset_file.file_path, header=0 if dataset_file.header else None)
        elif dataset_file.type_file == FileType.EXCEL:
            df = pd.read_excel(dataset_file.file_path, header=0 if dataset_file.header else None)
        elif dataset_file.type_file == FileType.PARQUET:
            df = pd.read_parquet(dataset_file.file_path)
        else:
            return HTTPException(status_code=400, detail="Unsupported file type")
        stats = []
        n_rows = len(df)
        for col in df.columns:
            uniques = df[col].unique()
            if pd.api.types.is_numeric_dtype(df[col]):
                numeric_vals = df[col].dropna().astype(float)
                bins = min(uniques.size, 10)
                counts, bin_edges = np.histogram(numeric_vals, bins=bins)
                histogram = []
                for i in range(len(counts)):
                    histogram.append({
                        "bin": f"{bin_edges[i]:.2f} - {bin_edges[i+1]:.2f}",
                        "count": int(counts[i])
                    })
            else:
                histogram = None
                if uniques.size <= 10:
                    histogram = []
                    value_counts = df[col].value_counts()
                    for val, count in value_counts.items():
                        histogram.append({
                            "bin": str(val),
                            "count": int(count)
                        })
            
            stats.append({
                "column": str(col),
                "type": str(df[col].dtype),
                "nulls": int(df[col].isnull().sum()),
                "nullPercent": float(df[col].isnull().sum() / n_rows * 100),
                "uniqueCount": int(uniques.size),
                "min": float(round(df[col].min(), 2)) if pd.api.types.is_numeric_dtype(df[col]) else None,
                "max": float(round(df[col].max(), 2)) if pd.api.types.is_numeric_dtype(df[col]) else None,
                "mean": float(round(df[col].mean(), 2)) if pd.api.types.is_numeric_dtype(df[col]) else None,
                "histogram": histogram
            })
        min_rows = min(n_rows, 1000)
        data = df.head(min_rows)
        #remplazar NaN por None
        data = data.where(pd.notnull(data), None)
        dataset_data.append({ "data": data.to_dict(orient='records'), "stats": stats, "type": dataset_file.dataset_type })
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    return {
        "data": dataset_data,
        "info": dataset
    }
    
@api_router.get("/dataset/{experiment_id}/columns")
async def get_experiment_dataset_columns(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found for this experiment")
    return {"columns": dataset.columns, "target": dataset.target_column}

@api_router.get("/iteration/{experiment_id}")
async def get_experiment_iteration(experiment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    iterations = db.query(Iteration).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).order_by(Iteration.created_at.desc()).all()
    return iterations


@api_router.delete("/iteration/{iteration_id}")
async def delete_experiment_iteration(iteration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    iteration = db.query(Iteration).filter(Iteration.id == iteration_id, Experiment.user_id == current_user.id).first()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")
    db.delete(iteration)
    db.commit()
    return {"detail": "Iteration deleted"}


@api_router.get("/{iteration_id}/download")
async def download_experiment_iteration(iteration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    iteration = db.query(Iteration).filter(Iteration.id == iteration_id, Experiment.user_id == current_user.id).first()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == iteration.experiment_id, Experiment.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found for this iteration")
    path = iteration.model_path
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.write(path, arcname="model.bin")
        metadata = {
            "iteration_id": iteration.id,
            "experiment_id": iteration.experiment_id,
            "created_at": iteration.created_at.isoformat(),
            "trained": iteration.trained,
            "label_encoder": iteration.label_encoder,
            "dataset": {
                "id": dataset.id,
                "name": dataset.name,
                "columns": dataset.columns,
                "target_column": dataset.target_column,
                "n_rows": dataset.n_rows,
                "n_classes": dataset.n_classes,
                "columns_encoder": dataset.columns_encoder
            },
            "hyperparameters": {
                "train_test_split": iteration.train_test_split,
                "train_test_split_seed": iteration.train_test_split_seed,
                "delete_nulls": iteration.delete_nulls,
                "drop_duplicates": iteration.drop_duplicates,
                "min_epochs": iteration.min_epochs,
                "max_epochs": iteration.max_epochs,
                "batch_size": iteration.batch_size,
                "learning_rate": iteration.learning_rate,
                "optimizer": iteration.optimizer,
                "loss_function": iteration.loss_function,
                "precompute_rules": iteration.precompute_rules,
                "force_precompute": iteration.force_precompute
            },
            "metrics": {
                "accuracy": iteration.accuracy,
                "precision": iteration.precision,
                "recall": iteration.recall,
                "f1_score": iteration.f1_score,
                "confusion_matrix": iteration.confusion_matrix,
                "classification_report": iteration.classification_report,
                "roc_auc": iteration.roc_auc
            }
        }
        zip_file.writestr("metadata.json", json.dumps(metadata, indent=4))
        
    zip_buffer.seek(0)
    return StreamingResponse(zip_buffer, media_type="application/x-zip-compressed", headers={"Content-Disposition": f"attachment; filename=iteration_{iteration_id}.zip"})


@api_router.post("/{experiment_id}/upload")
async def upload_experiment_iteration(
    experiment_id: int,
    file: UploadFile = File(...),
    label_encoder: str = Form(...),
    test_size: float = Form(0.2),
    split_seed: int = Form(42),
    shuffle: bool = Form(True),
    drop_nulls: bool = Form(False),
    drop_duplicates: bool = Form(False),
    min_epochs: int = Form(10),
    max_epochs: int = Form(50),
    batch_size: int = Form(32),
    learning_rate: float = Form(0.001),
    optimizer: str = Form("adam"),
    loss_function: str = Form("cross_entropy"),
    precompute_rules: bool = Form(True),
    force_precompute: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    label_encoder = json.loads(label_encoder)
    if label_encoder is None or not isinstance(label_encoder, dict) or len(label_encoder) == 0:
        raise HTTPException(status_code=400, detail="Invalid label encoder")
    experiment = db.query(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Datasets).filter(Datasets.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    #recibe el bin del modelo y un json con label encoder
    if not file.filename.endswith(".bin"):
        raise HTTPException(status_code=400, detail="Only .bin files are supported")
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
    if len(datasets) == 1:
        X = datasets[0]["data"]
        X.columns = X.columns.map(str)
        X = X[dataset.columns]
        if drop_nulls:
            X = X.dropna()
        if drop_duplicates:
            X = X.drop_duplicates()
        y = X[dataset.target_column]
        X = X.drop(columns=[dataset.target_column])
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X.columns:
                X[key] = X[key].replace(column_encoder)
        _, X_test, _, y_test = train_test_split(X, y, test_size=test_size, random_state=split_seed, shuffle=shuffle)
    elif len(datasets) == 2:
        X_test = datasets[1]["data"] if datasets[0]["dataset_type"] == DatasetType.TRAINING else datasets[0]["data"]
        X_test.columns = X_test.columns.map(str)
        if drop_nulls:
            X_test = X_test.dropna()
        if drop_duplicates:
            X_test = X_test.drop_duplicates()
        y_test = X_test[dataset.target_column]
        X_test = X_test.drop(columns=[dataset.target_column])
        for key, column_encoder in dataset.columns_encoder.items():
            if key in X_test.columns:
                X_test[key] = X_test[key].replace(column_encoder)
    else:
        return HTTPException(status_code=400, detail="More than 2 dataset files found")
    contents = await file.read()
    model_path = f"{settings.MODELS_FOLDER}/uploaded_model_{experiment_id}_{int(datetime.now().timestamp())}.bin"
    with open(model_path, "wb") as f:
        f.write(contents)
    try:
        ds = classifier.DSClassifierMultiQ(
            num_classes=dataset.n_classes,
            lr=learning_rate,
            max_iter=max_epochs,
            min_iter=min_epochs,
            batch_size=batch_size,
            lossfn=loss_function,
            optim=optimizer,
            debug_mode=True,
            device=settings.DEVICE
        )
        parser = DSParser.DSParser()
        ds.model.load_rules_bin(model_path)
        for rule in ds.model.preds:
            parser.lambda_rule_to_json(rule.ld, X_test.columns.tolist())
        X_test_np = X_test.to_numpy()
        y_test = y_test.astype(str).map(label_encoder)
        y_pred = ds.predict(X_test_np)
        try:
            acc = accuracy_score(y_test, y_pred)
        except:
            acc = 0.0
        try:
            y_proba = ds.predict_proba(X_test_np)
            y_proba = y_proba[:, 1] if dataset.n_classes == 2 else y_proba
            roc = roc_auc_score(y_true=y_test, y_score=y_proba, multi_class='ovr')
        except:
            roc = 0.0
        try:
            precision = precision_score(y_test, y_pred, average='weighted')
        except:
            precision = 0.0
        try:
            recall = recall_score(y_test, y_pred, average='weighted')
        except:
            recall = 0.0
        try:
            f1 = f1_score(y_test, y_pred, average='weighted')
        except:
            f1 = 0.0
        try:
            confusion = confusion_matrix(y_test, y_pred)
        except:
            confusion = np.zeros((dataset.n_classes, dataset.n_classes))
        try:
            report = classification_report(y_test, y_pred, output_dict=True)
        except:
            report = {}
    except Exception as e:
        #eliminar el modelo guardado
        os.remove(model_path)
        raise HTTPException(status_code=400, detail=f"Error loading model: {str(e)}")
    new_iteration = Iteration(
        experiment_id=experiment_id,
        model_path=model_path,
        created_at=datetime.now(),
        trained=True,
        label_encoder=label_encoder,
        train_test_split=test_size,
        train_test_split_seed=split_seed,
        shuffle=shuffle,
        delete_nulls=drop_nulls,
        drop_duplicates=drop_duplicates,
        min_epochs=min_epochs,
        max_epochs=max_epochs,
        batch_size=batch_size,
        learning_rate=learning_rate,
        optimizer=optimizer,
        loss_function=loss_function,
        precompute_rules=precompute_rules,
        force_precompute=force_precompute,
        accuracy=acc,
        precision=precision,
        recall=recall,
        f1_score=f1,
        confusion_matrix=confusion.tolist(),
        classification_report=report,
        roc_auc=roc,
        training_status=Status.COMPLETED,
        training_message="Model uploaded successfully",
        training_start_time=datetime.now(),
        training_end_time=datetime.now()
    )
    db.add(new_iteration)
    db.commit()
    db.refresh(new_iteration)
    return new_iteration


@api_router.get("/{experiment_id}/metrics")
async def get_experiment_metrics(
    experiment_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
    ):
    iterations = db.query(Iteration).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).all()
    if not iterations:
        raise HTTPException(status_code=404, detail="Metrics not found")
    metrics = [
        {
            "iteration_id": iteration.id,
            "created_at": iteration.created_at,
            "accuracy": iteration.accuracy,
            "precision": iteration.precision,
            "recall": iteration.recall,
            "f1Score": iteration.f1_score,
            "rocAuc": iteration.roc_auc
        } for iteration in iterations if iteration.accuracy is not None and iteration.precision is not None and iteration.recall is not None and iteration.f1_score is not None and iteration.roc_auc is not None
    ]
    return metrics


@api_router.get("/result/{experiment_id}/{iteration_id}")
async def get_results(
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