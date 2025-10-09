import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import Base, get_db
from models.user import User
from routes.auth import get_current_user_from_cookie


# Base de datos temporal (SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///./tests.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Crear tablas
Base.metadata.create_all(bind=engine)

# Sobrescribir la dependencia de BD de FastAPI
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        
# Sobrescribir la dependencia de usuario actual (simular un usuario autenticado)
def override_get_current_user_from_cookie():
    return User(id=1, name="testuser", email="test@example.com", password="hashedpassword")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user_from_cookie] = override_get_current_user_from_cookie

@pytest.fixture
def client():
    """Cliente de prueba para la API"""
    return TestClient(app)

@pytest.fixture(autouse=True)
def clear_tables():
    yield  # aquí se ejecuta el test
    # limpiar todas las tablas
    db = TestingSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    db.close()
