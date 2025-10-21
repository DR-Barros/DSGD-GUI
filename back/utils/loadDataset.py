import pandas as pd
import numpy as np
from models.dataset_file import FileType, DatasetType, DatasetFile

def load_datasets(dataset_files: list[DatasetFile], fileTypes=[FileType.CSV, FileType.EXCEL, FileType.PARQUET], datasetTypes=[DatasetType.TRAINING, DatasetType.TESTING, DatasetType.ALL], columns=None):
    """
    Load datasets from a list of DatasetFile objects.
    Args:
        dataset_files (list[DatasetFile]): Lista de objetos DatasetFile a cargar.
        fileTypes (list[FileType], optional): Tipos de archivo a considerar. Por defecto incluye todos.
        datasetTypes (list[DatasetType], optional): Tipos de dataset a considerar. Por defecto incluye todos.
        columns (list[str], optional): Lista de nombres de columnas a cargar. Por defecto carga todas las columnas.
    Returns:
        list: Lista de diccionarios con los datos cargados y metadatos asociados.
    """
    print("Loading datasets with columns:", columns, "fileTypes:", fileTypes, "datasetTypes:", datasetTypes, "from files:", dataset_files[0].header)
    datasets = []
    for dataset_file in dataset_files:
        if dataset_file.type_file not in fileTypes:
            continue
        if dataset_file.dataset_type not in datasetTypes:
            continue
        if dataset_file.type_file == FileType.CSV:
            X = pd.read_csv(dataset_file.file_path, header=0 if dataset_file.header else None, names=columns)
        elif dataset_file.type_file == FileType.EXCEL:
            X = pd.read_excel(dataset_file.file_path, header=0 if dataset_file.header else None, names=columns)
        elif dataset_file.type_file == FileType.PARQUET:
            X = pd.read_parquet(dataset_file.file_path, columns=columns)
        else:
            raise ValueError("Unsupported file type")
        datasets.append({
            "data": X,
            "header": dataset_file.header,
            "dataset_type": dataset_file.dataset_type
        })
    return datasets