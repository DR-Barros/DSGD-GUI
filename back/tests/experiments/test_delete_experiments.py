import pandas as pd
import json
def test_delete_experiment(client, tmp_path):
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
    response = client.get("/dsgd/api/experiments/")
    assert response.status_code == 200
    experiments = response.json()
    assert len(experiments) == 1
    
    experiment_id = experiments[0]["id"]

    # Eliminar el experimento
    response = client.delete(f"/dsgd/api/experiments/{experiment_id}")
    assert response.status_code == 200
    assert "Experiment deleted" in response.json()["detail"]

    # Verificar que el experimento ya no se puede obtener
    response = client.get("/dsgd/api/experiments/")
    assert response.status_code == 200
    experiments = response.json()
    assert len(experiments) == 0
    
    #Intentar eliminar un experimento que no existe
    response = client.delete(f"/dsgd/api/experiments/{experiment_id}")
    assert response.status_code == 404
    assert "Experiment not found" in response.json()["detail"]