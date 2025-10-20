import pytest
from fastapi import HTTPException
from jose import jwt
from auth import jwt_handler
from models.user import User


class DummySettings:
    SECRET_KEY = "test_secret"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 5
    REFRESH_TOKEN_EXPIRE_MINUTES = 10

jwt_handler.settings = DummySettings()


# ==========================
# Mock de base de datos
# ==========================

class DummyQuery:
    def __init__(self, user=None):
        self.user = user

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.user


class DummyDB:
    def __init__(self, user=None):
        self._user = user

    def query(self, model):
        return DummyQuery(self._user)

def test_get_current_user_valid():
    user = User(id=1, email="user@example.com", name="test", password="hashed")
    db = DummyDB(user)

    token = jwt_handler.create_access_token({"sub": "user@example.com"})
    result = jwt_handler.get_current_user(token, db)

    assert result is user


def test_get_current_user_invalid_token():
    db = DummyDB()
    with pytest.raises(HTTPException) as exc:
        jwt_handler.get_current_user("invalid.token", db)
    assert exc.value.status_code == 401
    assert "Token inválido" in exc.value.detail


def test_get_current_user_not_found():
    db = DummyDB(None)
    token = jwt_handler.create_access_token({"sub": "missing@example.com"})
    with pytest.raises(HTTPException) as exc:
        jwt_handler.get_current_user(token, db)
    assert exc.value.status_code == 401
    assert "Usuario no encontrado" in exc.value.detail


def test_get_current_user_from_refresh_token_valid():
    user = User(id=1, email="user@example.com", name="test", password="hashed")
    db = DummyDB(user)

    token = jwt_handler.create_refresh_token({"sub": "user@example.com"})
    result = jwt_handler.get_current_user_from_refresh_token(token, db)

    assert result is user


def test_get_current_user_from_refresh_token_invalid_type():
    user = User(id=1, email="user@example.com", name="test", password="hashed")
    db = DummyDB(user)

    token = jwt_handler.create_access_token({"sub": "user@example.com"})
    with pytest.raises(HTTPException) as exc:
        jwt_handler.get_current_user_from_refresh_token(token, db)
    assert exc.value.status_code == 401
    assert "Refresh token inválido" in exc.value.detail


def test_create_reset_password_token_and_verify():
    email = "user@example.com"
    token = jwt_handler.create_reset_password_token(email)
    assert token is not None
    payload = jwt_handler.verify_reset_password_token(token)
    assert payload is not None
    assert payload == email