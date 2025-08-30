import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from dsmodels import classifier, DSParser
from core.config import settings
from dsgd import DSRule


def train_model(
    X: pd.DataFrame,
    y: np.ndarray,
    test_size: float = 0.2,
    split_random_state: int = 42,
    shuffle: bool = True,
    max_iter: int = 100,
    min_iter: int = 10,
    batch_size: int = 4000,
    loss_function: str = "MSE",
    optimizer: str = "adam",
    learning_rate: float = 0.001,
    rules: list = [],
    n_classes: int = 2,
    label_to_num: dict = None,
    tasks_id: str = None,
):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=split_random_state, shuffle=shuffle)
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
        debug_mode=True
    )
    for rule in rules:
        ds.model.add_rule(DSRule(rule, "<lambda>"))
    for msg in ds.fit(X_train_np, y_train, add_single_rules=False, single_rules_breaks=3, add_mult_rules=False, column_names=columns, print_every_epochs=1, print_final_model=False):
        settings.TASKS_PROGRESS[tasks_id] = msg
        print(msg)
    print("Final evaluation...")
    y_pred = ds.predict(X_test_np)
    print(accuracy_score(y_test, y_pred))
    settings.TASKS_PROGRESS[tasks_id] = "Training finished ✅"