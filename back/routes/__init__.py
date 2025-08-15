from fastapi import APIRouter
from routes import auth, datasets

api_router = APIRouter()


api_router.include_router(auth.api_router, prefix="/auth", tags=["auth"])
api_router.include_router(datasets.api_router, prefix="/datasets", tags=["datasets"])