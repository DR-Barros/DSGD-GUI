import numpy as np
import pandas as pd

def sanitize_json(obj):
    """
    Función recursiva para sanitizar objetos antes de la serialización JSON.
    Convierte NaN a None y maneja tipos de datos de NumPy.
    """
    if isinstance(obj, dict):
        return {str(k): sanitize_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [sanitize_json(i) for i in obj]
    elif isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    elif isinstance(obj, np.generic):
        return obj.item()  # convierte np.int64, np.float32, etc. a tipos nativos
    elif isinstance(obj, (np.ndarray, pd.Series, pd.DataFrame)):
        return sanitize_json(obj.tolist())
    else:
        return obj
