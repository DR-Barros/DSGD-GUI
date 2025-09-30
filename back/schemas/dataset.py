from pydantic import BaseModel
from datetime import datetime
from typing import List

class DatasetOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    columns: List[str]
    target_column: str
    n_classes: int
    n_rows: int

    class Config:
        orm_mode = True