from fastapi import APIRouter
from routes import auth, datasets, experiments, train

api_router = APIRouter()


api_router.include_router(auth.api_router, prefix="/auth", tags=["auth"])
api_router.include_router(datasets.api_router, prefix="/datasets", tags=["datasets"])
api_router.include_router(experiments.api_router, prefix="/experiments", tags=["experiments"])
api_router.include_router(train.api_router, prefix="/train", tags=["train"])