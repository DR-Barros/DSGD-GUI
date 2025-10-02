from fastapi import APIRouter
from routes import auth, datasets, experiments, train, predict, rules

api_router = APIRouter()


api_router.include_router(auth.api_router, prefix="/auth", tags=["auth"])
api_router.include_router(datasets.api_router, prefix="/datasets", tags=["datasets"])
api_router.include_router(experiments.api_router, prefix="/experiments", tags=["experiments"])
api_router.include_router(train.api_router, prefix="/train", tags=["train"])
api_router.include_router(predict.api_router, prefix="/predict", tags=["predict"])
api_router.include_router(rules.api_router, prefix="/rules", tags=["rules"])