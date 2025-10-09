import io
import json
import pandas as pd

def test_preview_dataset(client, tmp_path):
    response = client.get("/dsgd/api/datasets/preview/1")
    assert response.status_code == 404  # Dataset no existe aún

    # Primero, subir un dataset
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

    # Ahora, previsualizar el dataset subido
    preview_response = client.get("/dsgd/api/datasets/preview/1")
    assert preview_response.status_code == 200
    preview_data = preview_response.json()[0]
    print(preview_data["stats"])
    #check type
    assert preview_data["type"] == "all"
    #check data
    assert len(preview_data["data"]) == 3
    assert preview_data["data"][0] == {"feature1": 1, "feature2": "A", "target": 0}
    assert preview_data["data"][1] == {"feature1": 2, "feature2": "B", "target": 1}
    assert preview_data["data"][2] == {"feature1": 3, "feature2": "C", "target": 0}
    #check stats
    assert preview_data["stats"][0]["column"] == "feature1"
    assert preview_data["stats"][0]["type"] == "int64"
    assert preview_data["stats"][0]["nulls"] == 0
    assert preview_data["stats"][0]["min"] == 1
    assert preview_data["stats"][0]["max"] == 3
    assert preview_data["stats"][0]["mean"] == 2.0
    assert preview_data["stats"][1]["column"] == "feature2"
    assert preview_data["stats"][1]["type"] == "object"
    assert preview_data["stats"][1]["nulls"] == 0
    assert preview_data["stats"][1]["uniqueCount"] == 3
    assert preview_data["stats"][2]["column"] == "target"
    assert preview_data["stats"][2]["type"] == "int64"
    assert preview_data["stats"][2]["nulls"] == 0
    assert preview_data["stats"][2]["min"] == 0
    assert preview_data["stats"][2]["max"] == 1
    assert preview_data["stats"][2]["mean"] == 0.33