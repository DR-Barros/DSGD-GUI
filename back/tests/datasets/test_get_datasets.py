def test_get_datasets_empty(client):
    response = client.get("/dsgd/api/datasets/")
    assert response.status_code == 200
    assert response.json() == [] 
