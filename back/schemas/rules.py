from pydantic import BaseModel
from typing import List

class RuleParams(BaseModel):
    singleRule: bool = False
    multipleRule: bool = False
    breakRules: int = 3
    selectedColumns: List[str]