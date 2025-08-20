import json
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from typing import List
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, Experiment
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
    print("Creating experiment")
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
