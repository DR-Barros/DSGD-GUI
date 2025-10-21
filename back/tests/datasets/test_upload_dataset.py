import io
import json
import pandas as pd

def test_upload_dataset_csv(client, tmp_path):
    # Crear CSV temporal
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
    assert datasets[0]["name"] == "Mi Dataset"
    assert datasets[0]["n_rows"] == 3
    assert datasets[0]["n_classes"] == 2
    assert set(datasets[0]["columns"]) == {"feature1", "feature2", "target"}
    assert datasets[0]["target_column"] == "target"


def test_upload_dataset_no_header(client, tmp_path):
    # Crear CSV temporal
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
    }

    response = client.post("/dsgd/api/datasets/upload", data=data, files=files)
    assert response.status_code == 400
    
    
def test_upload_dataset_2_files(client, tmp_path):
    # Crear dos CSV temporales
    df1 = pd.DataFrame({
        "feature1": [1, 2, 3],
        "feature2": ["A", "B", "C"],
        "target": [0, 1, 0]
    })
    csv_path1 = tmp_path / "test1.csv"
    df1.to_csv(csv_path1, index=False)

    df2 = pd.DataFrame({
        "feature1": [4, 5, 6],
        "feature2": ["D", "E", "F"],
        "target": [1, 0, 1]
    })
    csv_path2 = tmp_path / "test2.csv"
    df2.to_csv(csv_path2, index=False)

    files = [
        ("files", ("test1.csv", open(csv_path1, "rb"), "text/csv")),
        ("files", ("test2.csv", open(csv_path2, "rb"), "text/csv")),
    ]
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
    assert datasets[0]["n_rows"] == 3
    assert datasets[0]["name"] == "Mi Dataset"
    assert datasets[0]["n_classes"] == 2
    assert set(datasets[0]["columns"]) == {"feature1", "feature2", "target"}
    assert datasets[0]["target_column"] == "target"
    