from pydantic import BaseModel, ConfigDict
from datetime import datetime
from .dataset import DatasetOut

class ExperimentOut(BaseModel):
    id: int
    name: str
    user_id: int
    created_at: datetime
    datasets: DatasetOut

    model_config = ConfigDict(from_attributes=True)