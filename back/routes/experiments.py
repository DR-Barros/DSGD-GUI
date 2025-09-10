import json
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from typing import List
import zipfile
import io
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, Experiment, DatasetFile, Datasets, Iteration
from models.dataset_file import FileType, DatasetType
from schemas.experiment import ExperimentOut
from .auth import get_current_user_from_cookie
from datetime import datetime
from dsmodels import classifier
from core.config import settings
import pandas as pd
import numpy as np

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
    experiments = db.query(Experiment).filter(Experiment.user_id == current_user.id).options(joinedload(Experiment.datasets)).all()
    return experiments


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
        dataset_data.append({ "data": df.head(min_rows).to_dict(orient='records'), "stats": stats, "type": dataset_file.dataset_type })
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


@api_router.get("/iteration/rules/{iteration_id}")
async def get_experiment_iteration(iteration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_cookie)):
    iteration = db.query(Iteration).filter(Iteration.id == iteration_id, Experiment.user_id == current_user.id).first()
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == iteration.experiment_id, Experiment.user_id == current_user.id).first()
    path = iteration.model_path
    model = classifier.DSClassifierMultiQ(dataset.n_classes)
    model.model.load_rules_bin(path)
    rules = []
    for i in range(len(model.model.preds)):
        rules.append({
            "rule": model.model.preds[i].caption,
            "mass": model.model._params[i].detach().tolist()
        })
        print(f"Rule: {model.model.preds[i].caption}, Mass: {model.model._params[i]}")
    return {"rules": rules, "classes": iteration.label_encoder}


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