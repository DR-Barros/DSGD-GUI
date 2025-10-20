def test_refresh(client):
    # Register
    payload = {"name": "Test", "email": "t@example.com", "password": "secret"}
    r = client.post("/dsgd/api/auth/register", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "t@example.com"
    
    res = client.post("/dsgd/api/auth/register", json=payload)
    assert res.status_code == 400
    assert res.json()["detail"] == "Email ya registrado"
    
    #login
    r = client.post("/dsgd/api/auth/login", data={"username": "t@example.com", "password": "secret"})
    assert r.status_code == 200
    assert "access_token" in r.cookies
    assert "refresh_token" in r.cookies
    
    #refresh
    r = client.get("/dsgd/api/auth/refresh", cookies={"refresh_token": r.cookies["refresh_token"]})
    assert r.status_code == 200
    assert "access_token" in r.cookies
    assert "refresh_token" in r.cookies
    
    
def test_invalid_refresh_no_token(client):
    r = client.get("/dsgd/api/auth/refresh")
    assert r.status_code == 401
    assert r.json()["detail"] == "Refresh token no encontrado"