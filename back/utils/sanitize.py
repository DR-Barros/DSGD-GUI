import numpy as np

def sanitize_json(obj):
    if isinstance(obj, dict):
        return {str(k): sanitize_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [sanitize_json(i) for i in obj]
    elif isinstance(obj, np.generic):
        return obj.item()  # convierte np.int64, np.float32, etc. a tipos nativos
    else:
        return obj
