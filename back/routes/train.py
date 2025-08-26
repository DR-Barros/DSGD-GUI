import json
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from typing import List
from pydantic import BaseModel
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
from dsmodels import classifier, DSParser

api_router = APIRouter()

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
