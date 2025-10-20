def test_register(client):
    # Register
    payload = {"name": "Test", "email": "t@example.com", "password": "secret"}
    r = client.post("/dsgd/api/auth/register", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "t@example.com"
    
    #evaluamos que se no pueda registrar el mismo email
    res = client.post("/dsgd/api/auth/register", json=payload)
    assert res.status_code == 400
    assert res.json()["detail"] == "Email ya registrado"