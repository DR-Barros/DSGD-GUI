import pandas as pd
import json


def test_generate_rules(client, tmp_path):
    # Crear CSV temporal
    df = pd.DataFrame({
        "feature1": [1, 2, 3, 4],
        "feature2": ["A", "B", "A", "C"]
    })
    csv_path = tmp_path / "dataset.csv"
    df.to_csv(csv_path, index=False)

    # Insertar dataset y experimento en BD usando endpoint previo (si tu flujo lo hace)
    files = {"files": ("dataset.csv", open(csv_path, "rb"), "text/csv")}
    data = {
        "name": "Dataset Test",
        "columns": json.dumps(["feature1", "feature2"]),
        "target_column": "feature2",
        "n_classes": 2,
        "n_rows": 4,
        "header": "true",
    }
    res = client.post("/dsgd/api/datasets/upload", data=data, files=files)
    assert res.status_code == 200
    dataset_id = client.get("/dsgd/api/datasets/").json()[0]["id"]

    exp_data = {"name": "ExpTest", "dataset_id": dataset_id}
    res = client.post("/dsgd/api/experiments/", data=exp_data)
    assert res.status_code == 200
    exp_id = res.json()["id"]
    
    # Llamar al endpoint de generación de reglas
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
    res = client.post(f"/dsgd/api/rules/generate/{exp_id}", json=rule_data)
    assert res.status_code == 200
    assert "masses" in res.json()
    assert "rules" in res.json()
    assert "labels" in res.json()
    assert "columnsEncoder" in res.json()
    assert len(res.json()["rules"]) == 5
    assert len(res.json()["masses"]) == 5
    assert len(res.json()["labels"]) == 5
    assert res.json()["columnsEncoder"].keys() == {"feature2"}
    
def test_generate_rules_no_dataset(client):
    exp_id = 9999  
    rule_data = {
        "singleRule": True,
        "multipleRule": False,
        "selectedColumns": ["feature1", "feature2"],
        "breakRules": 2,
        "dropNulls": False,
        "dropDuplicates": False,
        "testSize": 0.2,
        "splitSeed": 42,
        "shuffle": True
    }
    res = client.post(f"/dsgd/api/rules/generate/{exp_id}", json=rule_data)
    assert res.status_code == 500
    assert res.json()["detail"] == "Error generating rules"
    