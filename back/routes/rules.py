from fastapi import APIRouter, Depends, HTTPException
from utils.sanitize import sanitize_json
from models import User, Experiment, DatasetFile, Datasets, Iteration
from models.user import User
from schemas.rules import RuleParams
from sqlalchemy.orm import Session 
from database import get_db
from .auth import get_current_user_from_cookie
from dsmodels import classifier, DSParser
import pandas as pd
import numpy as np
from models.dataset_file import FileType, DatasetType

api_router = APIRouter()

@api_router.post("/generate/{experiment_id}")
async def generate_rules(
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
            coverage = X.apply(rule.ld, axis=1).sum()
            if coverage == 0:
                continue # Saltar reglas que no cubren ningun caso
            vars = rule.ld.__defaults__
            #pasamos los valores np.float a float
            vars = [float(v) if isinstance(v, np.float64) else v for v in vars]
            lambda_fn = ds_parser.lambda_rule_to_json(rule.ld, vars)
            encoded_rules.append(lambda_fn)
            #manejamos los labels para que aquellos en que la regla se haya aplicado label encoder se vea el valor original
            index = False
            for key, column_encoder in dataset.columns_encoder.items():
                if key in rule.caption:
                    #separamos en signo igual
                    parts = rule.caption.split("=")
                    if len(parts) == 2:
                        labels.append(f"{parts[0]} = {list(column_encoder.keys())[list(column_encoder.values()).index(int(float(parts[1].strip())))]}")
                        index = True
                    break
            if not index:
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
    
    
@api_router.post("/coverage/{experiment_id}")
async def coverage_rules(
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
        #calculamos el numero de filas que cumplen la regla
        coverage = X.apply(fn, axis=1).sum()
        return {"coverage": int(coverage), "total": len(X), "percentage": round(coverage / len(X) * 100, 2)}
    except Exception as e:
        print("Error calculating coverage:", e)
        raise HTTPException(status_code=500, detail="Error calculating coverage")

    
@api_router.get("/iteration/{iteration_id}")
async def get_iteration_rules(
    iteration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_cookie)
):
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
    