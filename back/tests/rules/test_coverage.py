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
    rule = {
        "left": "feature1",
        "op": ">",
        "right": 2.5
    }
    res = client.post(f"/dsgd/api/rules/coverage/{exp_id}", json={"rule": rule})
    assert res.status_code == 200
    assert "coverage" in res.json()
    assert res.json()["coverage"] == 2
    assert "total" in res.json()
    assert res.json()["total"] == 4
    assert "percentage" in res.json()
    assert res.json()["percentage"] == 50.0