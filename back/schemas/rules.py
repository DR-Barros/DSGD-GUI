from pydantic import BaseModel
from typing import List

class RuleParams(BaseModel):
    singleRule: bool = False
    multipleRule: bool = False
    breakRules: int = 3
    selectedColumns: List[str]
    testSize: float = 0.2
    splitSeed: int = 42
    shuffle: bool = True
    dropNulls: bool = False
    dropDuplicates: bool = False