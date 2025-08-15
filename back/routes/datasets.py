import json
from fastapi import APIRouter, Depends, HTTPException, Request, Form, File, UploadFile
from typing import List
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, DatasetFile, Datasets
from models.dataset_file import FileType, DatasetType
from .auth import get_current_user_from_cookie
from datetime import datetime
from core.config import settings

api_router = APIRouter()


@api_router.post("/upload")
async def upload_dataset(
    name: str = Form(...),
    files: List[UploadFile] = File(...),
    columns: str = Form(...),
    n_classes: int = Form(...),
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
    try:
        columns = json.loads(columns)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Columnas no válidas")
    if not columns or len(columns) == 0:
        raise HTTPException(status_code=400, detail="Columnas no válidas")
    new_dataset = Datasets(
        name=name,
        user_id=current_user.id,
        created_at=datetime.now(datetime.now().tzinfo),
        n_classes=n_classes,
        columns=columns,
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    if len(files) == 1:
        file = files[0]
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["csv", "xlsx", "xls", "parquet"]:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo no soportado: {ext}")

        # Definir tipo de archivo
        type_file = FileType.CSV if ext == "csv" else FileType.EXCEL if ext in ["xlsx", "xls"] else FileType.PARQUET
        
        #guardar dataset
        file_path = f"{settings.UPLOAD_FOLDER}/{new_dataset.id}_{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        dataset_file = DatasetFile(
            dataset_id=new_dataset.id,
            file_path=file_path,
            type_file=type_file,
            dataset_type=DatasetType.ALL
        )
        db.add(dataset_file)
        db.commit()
        db.refresh(dataset_file)
    else:
        files.sort(key=lambda x: x.size)  # Ordenar por tamaño
        for file in files:
            ext = file.filename.split(".")[-1].lower()
            if ext not in ["csv", "xlsx", "xls", "parquet"]:
                raise HTTPException(status_code=400, detail=f"Tipo de archivo no soportado: {ext}")

            # Definir tipo de archivo
            type_file = FileType.CSV if ext == "csv" else FileType.EXCEL if ext in ["xlsx", "xls"] else FileType.PARQUET

            # Guardar dataset
            file_path = f"{settings.UPLOAD_FOLDER}/{new_dataset.id}_{file.filename}"
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            dataset_file = DatasetFile(
                dataset_id=new_dataset.id,
                file_path=file_path,
                type_file=type_file,
                dataset_type=DatasetType.TRAINING if file == files[1] else DatasetType.TESTING
            )
            db.add(dataset_file)
            db.commit()
            db.refresh(dataset_file)

    return {"info": f"Dataset '{name}' uploaded successfully"}
