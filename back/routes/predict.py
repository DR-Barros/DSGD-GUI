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


@api_router.post("/{iteration_id}")
async def predict(
    iteration_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
    iteration = db.query(Iteration).join(Experiment).filter(Iteration.id == iteration_id, Experiment.user_id == current_user.id).first()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")
    if not iteration.model_path:
        raise HTTPException(status_code=400, detail="Model not trained yet")
    experiment = db.query(Experiment).filter(Experiment.id == iteration.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    dataset = db.query(Datasets).filter(Datasets.id == experiment.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    data = await request.json()
    print("Data received for prediction:", data)
    try:
        model = classifier.DSClassifierMultiQ(num_classes=dataset.n_classes)
        model.model.load_rules_bin(iteration.model_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")
    columns = [col.strip() for col in dataset.columns if col != dataset.target_column]
    df = pd.DataFrame(data["predictData"], columns=columns)
    if df.empty:
        raise HTTPException(status_code=400, detail="No data provided for prediction")
    df.replace("", np.nan, inplace=True)
    #convertir a numérico donde sea posible
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = pd.to_numeric(df[col], errors='ignore')
    try:
        print("Data for prediction:\n", df)
        predictions = []
        for _, row in df.iterrows():
            pred = model.predict_explain(row.to_numpy())
            print("Prediction:", pred[2], type(pred[2]))
            predictions.append({
                "class": int(pred[1]),
                "probabilities": sanitize_json(pred[0].tolist()),
                "rules": pred[2].to_dict("records")
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during prediction: {str(e)}")

    return {"predictions": sanitize_json(predictions), "labels": iteration.label_encoder}