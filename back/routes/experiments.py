import json
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from typing import List
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, Experiment, DatasetFile, Datasets
from models.dataset_file import FileType, DatasetType
from schemas.experiment import ExperimentOut
from .auth import get_current_user_from_cookie
from datetime import datetime
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
        dataset_data.append({ "data": df.to_dict(orient='records'), "stats": stats, "type": dataset_file.dataset_type })
    dataset = db.query(Datasets).join(Experiment).filter(Experiment.id == experiment_id, Experiment.user_id == current_user.id).first()
    return {
        "data": dataset_data,
        "info": dataset
    }