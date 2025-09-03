import json
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, classification_report
from sklearn.model_selection import train_test_split
from models.iteration import Iteration
from dsmodels import classifier, DSParser
from core.config import settings
from dsgd import DSRule
from sqlalchemy.orm import Session
from datetime import datetime


def train_model(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: np.ndarray,
    y_test: np.ndarray,
    max_iter: int = 100,
    min_iter: int = 10,
    batch_size: int = 4000,
    loss_function: str = "MSE",
    optimizer: str = "adam",
    learning_rate: float = 0.001,
    rules: list = [],
    n_classes: int = 2,
    label_to_num: dict = None,
    db: Session = None,
    tasks_id: str = None,
):
    try:
        #eliminemos las columnas no numericas o booleanas
        X_train = X_train.select_dtypes(include=[np.number, 'bool'])
        X_test = X_test.select_dtypes(include=[np.number, 'bool'])
        dsparser = DSParser.DSParser()
        functions = []
        for rule, mass, label in rules:
            f = dsparser.json_to_lambda(rule, X_train.columns.tolist())
            functions.append((f, mass, label))
        print(X_train.dtypes)
        X_train_np = X_train.to_numpy()
        X_test_np = X_test.to_numpy()
        columns = X_train.columns.tolist()
        settings.TASKS_PROGRESS[tasks_id] = "Initializing model..."
        ds = classifier.DSClassifierMultiQ(
            num_classes=n_classes,
            lr=learning_rate,
            max_iter=max_iter,
            min_iter=min_iter,
            batch_size=batch_size,
            lossfn=loss_function,
            optim=optimizer,
            debug_mode=True,
            device=settings.DEVICE
        )
        for rule, mass, label in functions:
            m_uncert = None
            m_sing = None
            if sum(mass) == 1:
                m_uncert = mass[-1]
                m_sing = mass[:-1]
            ds.model.add_rule(DSRule(rule, label), m_sing=m_sing, m_uncert=m_uncert)

        iteration = db.query(Iteration).filter(Iteration.id == int(tasks_id)).first()
        iteration.training_status = "running"
        iteration.training_start_time = datetime.now()
        db.commit()

        for msg in ds.fit(X_train_np, y_train, add_single_rules=False, single_rules_breaks=3, add_mult_rules=False, column_names=columns, print_every_epochs=1, print_final_model=False):
            settings.TASKS_PROGRESS[tasks_id] = msg
            iteration.training_message = msg
            db.commit()
            print(msg)
        data = {
            "status": "evaluation"
        }
        settings.TASKS_PROGRESS[tasks_id] = json.dumps(data)
        path = settings.MODELS_FOLDER + f"/model_{tasks_id}.bin"
        ds.model.save_rules_bin(path)
        iteration.training_end_time = datetime.now()
        iteration.trained = True
        iteration.training_status = "completed"
        iteration.model_path = path
        db.commit()
        print("Final evaluation...")
        y_pred = ds.predict(X_test_np)
        acc = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
        confusion = confusion_matrix(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True)
        iteration.accuracy = acc
        iteration.precision = precision
        iteration.recall = recall
        iteration.f1_score = f1
        iteration.confusion_matrix = confusion.tolist()
        iteration.classification_report = report
        db.commit()
        print(acc)
        print(precision)
        print(recall)
        print(f1)
        print(confusion)
        print(report)
        
        settings.TASKS_PROGRESS[tasks_id] = "Training finished ✅"
    except Exception as e:
        print(f"Error during training: {e}")
        settings.TASKS_PROGRESS[tasks_id] = f"Error during training: {e}"
        iteration.training_status = "error"
        iteration.training_message = str(e)
        db.commit()