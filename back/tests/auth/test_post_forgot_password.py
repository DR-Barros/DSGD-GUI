from unittest.mock import patch, MagicMock

def test_forgot_password_email(client):
    # Register
    payload = {"name": "Test", "email": "test@example.com", "password": "secret"}
    r = client.post("/dsgd/api/auth/register", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "test@example.com"

    # Mock SMTP to avoid sending real emails
    with patch("smtplib.SMTP_SSL") as mock_smtp:
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        response = client.post("/dsgd/api/auth/forgot-password", json={"email": "test@example.com"})
        assert response.status_code == 200
        assert "Password reset email sent" in response.json()["message"]
        mock_server.login.assert_called_once()
        mock_server.sendmail.assert_called_once()
        
def test_forgot_password_nonexistent_email(client):
    response = client.post("/dsgd/api/auth/forgot-password", json={"email": "nonexistent@example.com"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuario no encontrado"
    
def test_forgot_password_no_email_provided(client):
    response = client.post("/dsgd/api/auth/forgot-password", json={})
    assert response.status_code == 400
    assert response.json()["detail"] == "Email is required"