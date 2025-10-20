import json
import pandas as pd
import random


def test_train_model_1file(client, tmp_path):
    df = pd.DataFrame({
        "feature1": [1, 2, 3, 1, 1, 2, 3, 1, 2, 3],
        "feature2": [3, 4, 5, 3, 3, 4, 5, 3, 4, 5],
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
    assert response.status_code == 200
    experiment = response.json()
    
    rules = [
        {"left": "feature1", "op": ">=", "right": 2},
        {"left": "feature1", "op": "<", "right": 2},
        {"left": "feature2", "op": ">=", "right": 4},
        {"left": "feature2", "op": "<", "right": 4},
    ]
    masses = [[0.1, 0.1, 0.8], [0.2, 0.2, 0.6], [0.3, 0.3, 0.4], [0.4, 0.4, 0.2]]
    labels = ["feature1>=2", "feature1<2", "feature2>=4", "feature2<4"]


    #entrenar el modelo
    response = client.post(f"/dsgd/api/train/train-model/{experiment['id']}", json={
        "minEpochs": 1,
        "maxEpochs": 1,
        "rules": rules,
        "labels": labels,
        "masses": masses,
    })
    assert response.status_code == 200
    train_result = response.json()
    print(train_result)
    assert "task_id" in train_result
    assert "status" in train_result
    assert train_result["status"] == "Task enqueued"
    
    
def test_train_model_no_rules(client, tmp_path):
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
    assert response.status_code == 200
    experiment = response.json()
    
    #entrenar el modelo sin reglas
    response = client.post(f"/dsgd/api/train/train-model/{experiment['id']}", json={
        "minEpochs": 1,
        "maxEpochs": 1,
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "No rules provided for training"
    
    
def test_train_model_bad_rules_length(client, tmp_path):
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
    assert response.status_code == 200
    experiment = response.json()
    
    #entrenar el modelo con reglas de longitudes distintas
    response = client.post(f"/dsgd/api/train/train-model/{experiment['id']}", json={
        "minEpochs": 1,
        "maxEpochs": 1,
        "rules": [1,2,3],
        "labels": [0,1],
        "masses": [0.5,0.5,0.5]
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "The rules are bad"
    
    
def test_train_ws(client, tmp_path):
    random.seed(42)
    df = pd.DataFrame({
        "feature1": [random.randint(1, 3) for _ in range(1000)],
        "feature2": [random.randint(3, 5) for _ in range(1000)],
        "target": [random.randint(0, 1) for _ in range(1000)]
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
    assert response.status_code == 200
    experiment = response.json()
    
    #obtener reglas
    rule_data = {
        "singleRule": True,
        "multipleRule": False,
        "selectedColumns": ["feature1", "feature2"],
        "breakRules": 1,
        "dropNulls": False,
        "dropDuplicates": False,
        "testSize": 0.2,
        "splitSeed": 42,
        "shuffle": True
    }
    
    rules = [
        {"left": "feature1", "op": ">=", "right": 2},
        {"left": "feature1", "op": "<", "right": 2},
        {"left": "feature2", "op": ">=", "right": 4},
        {"left": "feature2", "op": "<", "right": 4},
    ]
    masses = [[0.1, 0.1, 0.8], [0.2, 0.2, 0.6], [0.3, 0.3, 0.4], [0.4, 0.4, 0.2]]
    labels = ["feature1>=2", "feature1<2", "feature2>=4", "feature2<4"]

    #entrenar el modelo
    response = client.post(f"/dsgd/api/train/train-model/{experiment['id']}", json={
        "minEpochs": 1000,
        "maxEpochs": 1000,
        "rules": rules,
        "labels": labels,
        "masses": masses,
    })
    assert response.status_code == 200
    train_result = response.json()
    print(train_result)
    assert "task_id" in train_result
    assert "status" in train_result
    assert train_result["status"] == "Task enqueued"
    
    #nos conectamos al websocket
    with client.websocket_connect(f"/dsgd/api/train/ws/{train_result['task_id']}") as websocket:
        #recibimos updates de entrenamiento
        patience = 0
        while True:
            try:
                data = websocket.receive_text()
                data = json.loads(data)
                assert "status" in data
                assert "epoch" in data
                assert "max" in data
                assert "loss" in data
                assert "time" in data
                assert "eta" in data
                assert data["status"] == "training"
                break
            except:
                patience += 1
                if patience > 5:
                    assert False, "No se recibieron datos del websocket de entrenamiento"
                
        
        #detenemos el entrenamiento
        websocket.send_text("stop")
        data = websocket.receive_text()
        data = json.loads(data)
        print(data)
        assert data["status"] == "Training stopped by user"
        
        
    #obtenemos la iteracion entrenada
    response = client.get(f"/dsgd/api/train/iteration/{train_result['task_id']}")
    assert response.status_code == 200
    iteration = response.json()
    print(iteration)
    assert iteration["id"] == int(train_result['task_id'])
    assert "classification_report" in iteration
    assert "confusion_matrix" in iteration
    assert "accuracy" in iteration
    assert "precision" in iteration
    assert "recall" in iteration
    assert "f1_score" in iteration
    assert "roc_auc" in iteration
    assert "model_path" in iteration
    assert "max_epochs" in iteration
    assert "min_epochs" in iteration
    assert "learning_rate" in iteration
    assert "batch_size" in iteration
    assert "optimizer" in iteration
    assert "loss_function" in iteration
    assert "min_dloss" in iteration
    assert "train_test_split" in iteration
    assert "train_test_split_seed" in iteration
    assert "delete_nulls" in iteration
    assert "drop_duplicates" in iteration
    assert "precompute_rules" in iteration
    assert "force_precompute" in iteration
    assert "shuffle" in iteration
    assert "training_status" in iteration
    assert "label_encoder" in iteration
    assert "training_start_time" in iteration
    assert "training_end_time" in iteration
    assert "training_message" in iteration