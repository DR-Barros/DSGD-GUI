import pandas as pd
import json
from dsgd.DSClassifierMultiQ import DSClassifierMultiQ

def test_post_experiment(client, tmp_path):
    df = pd.DataFrame({
        "feature1": [1, 2, 3, 1, 1, 2, 3, 1, 2, 3],
        "feature2": ["A", "B", "C", "A", "A", "B", "C", "A", "B", "C"],
        "target": [0, 1, 0, 0, 0, 1, 0, 0, 1, 0]
    })
    csv_path = tmp_path / "test.csv"
    df.to_csv(csv_path, index=False)

    files = {"files": ("test.csv", open(csv_path, "rb"), "text/csv")}
    data = {
        "name": "Mi Dataset",
        "columns": json.dumps(["feature1", "feature2", "target"]),
        "target_column": "target",
        "n_classes": 2,
        "n_rows": 3,
        "header": "true",
    }

    response = client.post("/dsgd/api/datasets/upload", data=data, files=files)
    assert response.status_code == 200
    assert "uploaded successfully" in response.json()["info"]
    
    # Verificar que el dataset se puede obtener
    response = client.get("/dsgd/api/datasets/")
    assert response.status_code == 200
    datasets = response.json()
    assert len(datasets) == 1
    dataset_id = datasets[0]["id"]
    # Crear experimento con el dataset subido
    experiment_data = {
        "name": "Mi Experimento",
        "dataset_id": dataset_id
    }
    response = client.post("/dsgd/api/experiments/", data=experiment_data)
    experiment = response.json()
    X = df.copy()
    columnEncoder = {'feature2': {'A': 0, 'B': 1, 'C': 2}}
    for key, column_encoder in columnEncoder.items():
        if key in X.columns:
            X[key] = X[key].map(column_encoder)
    selectedColumns = ["feature1", "feature2"]
    
    dsc = DSClassifierMultiQ(
        num_classes=2,
    )
    X_np = X[selectedColumns].to_numpy()
    dsc.model.generate_categorical_rules(
        X_np,
        column_names=selectedColumns
    )
    model_path = tmp_path / "model.bin"
    dsc.model.save_rules_bin(model_path)
    #envio un form-data con el modelo
    with open(model_path, "rb") as f:
        files = {"file": ("model.bin", f, "application/octet-stream")}
        data = {
            "label_encoder": json.dumps({"0": 0, "1": 1}),
            "test_size": 0.2,
            "split_seed": 42,
            "shuffle": True,
            "drop_nulls": False,
            "drop_duplicates": False,
            "min_epochs": 10,
            "max_epochs": 50,
            "batch_size": 32,
            "learning_rate": 0.001,
            "optimizer": "adam",
            "loss_function": "cross_entropy",
            "precompute_rules": True,
            "force_precompute": True,
        }

        response = client.post(
            f"/dsgd/api/experiments/{experiment['id']}/upload",
            data=data,
            files=files,
        )
        assert response.status_code == 200
        res = response.json()
        assert "id" in res
        assert "accuracy" in res
        assert "precision" in res
        assert "recall" in res
        assert "f1_score" in res
        assert "confusion_matrix" in res
        assert "classification_report" in res
        assert "roc_auc" in res
        assert "model_path" in res
        assert "batch_size" in res
        assert "learning_rate" in res
        assert "min_epochs" in res
        assert "max_epochs" in res
        assert "optimizer" in res
        assert "loss_function" in res
        assert "train_test_split" in res
        assert "train_test_split_seed" in res
        assert "delete_nulls" in res
        assert "drop_duplicates" in res
        assert "precompute_rules" in res
        assert "force_precompute" in res
        assert "label_encoder" in res