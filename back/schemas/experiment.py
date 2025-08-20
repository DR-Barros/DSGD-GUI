from pydantic import BaseModel
from datetime import datetime
from .dataset import DatasetOut

class ExperimentOut(BaseModel):
    id: int
    name: str
    user_id: int
    created_at: datetime
    datasets: DatasetOut

    class Config:
        orm_mode = True