import pandas as pd
import json
def test_get_experiment_dataset(client, tmp_path):
    response = client.get("/dsgd/api/experiments/")
    assert response.status_code == 200
    experiments = response.json()
    assert isinstance(experiments, list)
    assert len(experiments) == 0

    # Subir un dataset primero
    df = pd.DataFrame({
        "feature1": [1, 2, 3],
        "feature2": ["A", "B", "C"],
        "target": [0, 1, 0]
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
    assert experiment["name"] == "Mi Experimento"
    assert experiment["dataset_id"] == dataset_id

    # Verificar que el experimento se puede obtener
    response = client.get(f"/dsgd/api/experiments/dataset/{experiment['id']}")
    assert response.status_code == 200
    dataset = response.json()
    #check data
    assert len(dataset["data"]) == 1
    assert len(dataset["data"][0]) == 3
    assert dataset["data"][0]["data"][0] == {"feature1": 1, "feature2": "A", "target": 0}
    assert dataset["data"][0]["data"][1] == {"feature1": 2, "feature2": "B", "target": 1}
    assert dataset["data"][0]["data"][2] == {"feature1": 3, "feature2": "C", "target": 0}
    #check stats
    assert dataset["data"][0]["stats"][0]["column"] == "feature1"
    assert dataset["data"][0]["stats"][0]["type"] == "int64"
    assert dataset["data"][0]["stats"][0]["nulls"] == 0
    assert dataset["data"][0]["stats"][0]["min"] == 1
    assert dataset["data"][0]["stats"][0]["max"] == 3
    assert dataset["data"][0]["stats"][0]["mean"] == 2.0
    assert dataset["data"][0]["stats"][1]["column"] == "feature2"
    assert dataset["data"][0]["stats"][1]["type"] == "object"
    assert dataset["data"][0]["stats"][1]["nulls"] == 0
    assert dataset["data"][0]["stats"][1]["uniqueCount"] == 3
    assert dataset["data"][0]["stats"][2]["column"] == "target"
    assert dataset["data"][0]["stats"][2]["type"] == "int64"
    assert dataset["data"][0]["stats"][2]["nulls"] == 0
    assert dataset["data"][0]["stats"][2]["min"] == 0
    assert dataset["data"][0]["stats"][2]["max"] == 1
    assert dataset["data"][0]["stats"][2]["mean"] == 0.33
    