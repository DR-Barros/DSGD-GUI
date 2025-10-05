import os
import queue
from dotenv import load_dotenv
from sqlalchemy import create_engine
import torch

load_dotenv()

class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "default_secret")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60*24))
    REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 60*24))
    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "upload")
    DATASETS_FOLDER = os.path.join(UPLOAD_FOLDER, "datasets")
    MODELS_FOLDER = os.path.join(UPLOAD_FOLDER, "models")
    # Task queue settings
    MAX_WORKERS = 2
    TASK_QUEUE = queue.Queue()
    TASKS_PROGRESS = {}
    # Configure device for PyTorch
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    # Database configuration
    DB_ENGINE = os.getenv("DB_ENGINE", "sqlite")
    if DB_ENGINE == "sqlite":
        DATABASE_URL = "sqlite:///./test.db"
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    else:
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")
        DB_HOST = os.getenv("DB_HOST", "localhost")
        DB_PORT = os.getenv("DB_PORT", "5432")
        DB_NAME = os.getenv("DB_NAME")
        DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        engine = create_engine(DATABASE_URL)


    def __init__(self):
        if not os.path.exists(self.UPLOAD_FOLDER):
            os.makedirs(self.UPLOAD_FOLDER)
        if not os.path.exists(self.DATASETS_FOLDER):
            os.makedirs(self.DATASETS_FOLDER)
        if not os.path.exists(self.MODELS_FOLDER):
            os.makedirs(self.MODELS_FOLDER)

settings = Settings()