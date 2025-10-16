import json
import os
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models import User, DatasetFile, Datasets, Experiment, Iteration
from models.dataset_file import FileType, DatasetType
from .auth import get_current_user_from_cookie
from datetime import datetime
from core.config import settings
from schemas.dataset import DatasetOut
import pandas as pd
import numpy as np
from sklearn.calibration import LabelEncoder
from utils.loadDataset import load_datasets

api_router = APIRouter()


@api_router.get("/", response_model=List[DatasetOut])
async def get_datasets(
    current_user: User = Depends(get_current_user_from_cookie),
    db: Session = Depends(get_db)
):
    datasets = db.query(Datasets).filter(Datasets.user_id == current_user.id).all()
    return datasets


@api_router.get("/preview/{dataset_id}")
async def preview_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user_from_cookie),
    db: Session = Depends(get_db)
):
    dataset_files = db.query(DatasetFile).filter(DatasetFile.dataset_id == dataset_id).all()
    if not dataset_files or len(dataset_files) == 0:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    dataset_data = []
    datasets = load_datasets(dataset_files)
    for dataset in datasets:
        df = dataset["data"]
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
        df = df.where(pd.notnull(df), None)
        dataset_data.append({ "data": df.head(min_rows).to_dict(orient='records'), "stats": stats, "type": dataset["dataset_type"]})

    return dataset_data


@api_router.post("/upload")
async def upload_dataset(
    name: str = Form(...),
    files: List[UploadFile] = File(...),
    columns: str = Form(...),
    target_column: str = Form(...),
    n_classes: int = Form(...),
    n_rows: int = Form(...),
    header: bool = Form(...),
    current_user: User = Depends(get_current_user_from_cookie),
    db: Session = Depends(get_db)
):
    if files is None or len(files) not in [1, 2]:
        raise HTTPException(status_code=400, detail="Se requieren 1 o 2 archivos")
    name = name.strip()
    if not name or name == "":
        raise HTTPException(status_code=400, detail="Nombre del dataset no válido")
    if not n_classes or n_classes <= 0:
        raise HTTPException(status_code=400, detail="Número de clases no válido")
    if not n_rows or n_rows <= 0:
        raise HTTPException(status_code=400, detail="Número de filas no válido")
    try:
        columns = json.loads(columns)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Columnas no válidas")
    if not columns or len(columns) == 0:
        raise HTTPException(status_code=400, detail="Columnas no válidas")
    if not target_column or target_column.strip() == "" or target_column not in columns:
        raise HTTPException(status_code=400, detail="Columna objetivo no válida")
    for col in columns:
        if not col or col.strip() == "":
            raise HTTPException(status_code=400, detail="Una de las columnas está vacía")
    if header is None:
        raise HTTPException(status_code=400, detail="Debe especificar si el archivo tiene encabezados")
    new_dataset = Datasets(
        name=name,
        user_id=current_user.id,
        created_at=datetime.now(datetime.now().tzinfo),
        n_classes=n_classes,
        target_column=target_column,
        n_rows=n_rows,
        columns=columns,
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    datasets = []
    if len(files) == 1:
        file = files[0]
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["csv", "xlsx", "xls", "parquet"]:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo no soportado: {ext}")

        # Definir tipo de archivo
        type_file = FileType.CSV if ext == "csv" else FileType.EXCEL if ext in ["xlsx", "xls"] else FileType.PARQUET
        
        #guardar dataset
        file_path = f"{settings.DATASETS_FOLDER}/{new_dataset.id}_{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        if type_file == FileType.CSV:
            datasets.append(pd.read_csv(file_path))
        elif type_file == FileType.EXCEL:
            datasets.append(pd.read_excel(file_path))
        else:
            datasets.append(pd.read_parquet(file_path))
        dataset_file = DatasetFile(
            dataset_id=new_dataset.id,
            file_path=file_path,
            type_file=type_file,
            dataset_type=DatasetType.ALL,
            header=header
        )
        db.add(dataset_file)
        db.commit()
        db.refresh(dataset_file)
    else:
        for file in files:
            ext = file.filename.split(".")[-1].lower()
            if ext not in ["csv", "xlsx", "xls", "parquet"]:
                raise HTTPException(status_code=400, detail=f"Tipo de archivo no soportado: {ext}")

            # Definir tipo de archivo
            type_file = FileType.CSV if ext == "csv" else FileType.EXCEL if ext in ["xlsx", "xls"] else FileType.PARQUET

            # Guardar dataset
            file_path = f"{settings.DATASETS_FOLDER}/{new_dataset.id}_{file.filename}"
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            if type_file == FileType.CSV:
                datasets.append(pd.read_csv(file_path))
            elif type_file == FileType.EXCEL:
                datasets.append(pd.read_excel(file_path))
            else:
                datasets.append(pd.read_parquet(file_path))
            dataset_file = DatasetFile(
                dataset_id=new_dataset.id,
                file_path=file_path,
                type_file=type_file,
                dataset_type=DatasetType.TRAINING if file == files[0] else DatasetType.TESTING,
                header=header
            )
            db.add(dataset_file)
            db.commit()
            db.refresh(dataset_file)

    X = pd.concat(datasets)
    columns_encoder = {}
    for column in X.select_dtypes(exclude=["number"]).columns:
        print(column)
        encoder = LabelEncoder()
        encoder.fit_transform(X[column])
        label_to_num = {label: idx for idx, label in enumerate(encoder.classes_)}
        columns_encoder[column] = label_to_num
    print(columns_encoder)
    new_dataset.columns_encoder = columns_encoder
    db.commit()
    db.refresh(new_dataset)
    return {"info": f"Dataset '{name}' uploaded successfully"}

@api_router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user_from_cookie),
    db: Session = Depends(get_db)
):
    dataset = db.query(Datasets).filter(Datasets.id == dataset_id, Datasets.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    
    #Buscamos experimentos que usen este dataset
    experiments = db.query(Experiment).filter(Experiment.dataset_id == dataset_id).all()
    for experiment in experiments:
        #Eliminar iteraciones asociadas
        iterations = db.query(Iteration).filter(Iteration.experiment_id == experiment.id).all()
        for iteration in iterations:
            if iteration.model_path and os.path.exists(iteration.model_path):
                try:
                    os.remove(iteration.model_path)
                except Exception as e:
                    print(f"Error al eliminar el archivo {iteration.model_path}: {e}")
            db.delete(iteration)
        db.delete(experiment)
    db.commit()
    
    # Eliminar archivos asociados
    dataset_files = db.query(DatasetFile).filter(DatasetFile.dataset_id == dataset_id).all()
    for dataset_file in dataset_files:
        try:
            os.remove(dataset_file.file_path)
        except Exception as e:
            print(f"Error al eliminar el archivo {dataset_file.file_path}: {e}")
        db.delete(dataset_file)
    
    db.delete(dataset)
    db.commit()
    return {"info": f"Dataset '{dataset.name}' eliminado exitosamente"}