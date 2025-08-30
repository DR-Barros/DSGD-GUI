import os
import queue
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "default_secret")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60*24))
    REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 60*24))
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "upload")
    DATASETS_FOLDER = os.path.join(UPLOAD_FOLDER, "datasets")
    MODELS_FOLDER = os.path.join(UPLOAD_FOLDER, "models")
    MAX_WORKERS = 2
    TASK_QUEUE = queue.Queue()
    TASKS_PROGRESS = {}
    

    def __init__(self):
        if not os.path.exists(self.UPLOAD_FOLDER):
            os.makedirs(self.UPLOAD_FOLDER)
        if not os.path.exists(self.DATASETS_FOLDER):
            os.makedirs(self.DATASETS_FOLDER)
        if not os.path.exists(self.MODELS_FOLDER):
            os.makedirs(self.MODELS_FOLDER)

settings = Settings()