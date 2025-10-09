from pydantic import BaseModel, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)