from pydantic import BaseModel
from datetime import datetime

class DatasetOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    columns: list[str]
    target_column: str
    n_classes: int
    n_rows: int

    class Config:
        orm_mode = True