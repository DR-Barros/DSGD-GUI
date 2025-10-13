import pytest
from utils.sanitize import sanitize_json
import numpy as np

def test_sanitize_json_numpy_types():
    data = {
        "int": np.int64(42),
        "float": np.float32(3.14),
        "list": [np.int32(1), np.float64(2.71)],
        "dict": {"nested_int": np.int16(7)},
        "normal": "string"
    }
    sanitized = sanitize_json(data)
    assert sanitized["int"] == 42
    assert isinstance(sanitized["int"], int)
    assert round(sanitized["float"], 2) == 3.14
    assert isinstance(sanitized["float"], float)
    assert sanitized["list"][0] == 1
    assert isinstance(sanitized["list"][0], int)
    assert round(sanitized["list"][1], 2) == 2.71
    assert isinstance(sanitized["list"][1], float)
    assert all(isinstance(i, (int, float)) for i in sanitized["list"])
    assert sanitized["dict"]["nested_int"] == 7
    assert isinstance(sanitized["dict"]["nested_int"], int)
    assert sanitized["normal"] == "string"
    assert isinstance(sanitized["normal"], str)