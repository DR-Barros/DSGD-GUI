import pandas as pd
import pytest
from pathlib import Path

from models.dataset_file import FileType, DatasetType
from utils.loadDataset import load_datasets

class MockDatasetFile:
    def __init__(self, file_path, type_file, dataset_type, header=True):
        self.file_path = file_path
        self.type_file = type_file
        self.dataset_type = dataset_type
        self.header = header



def test_load_datasets(tmp_path: Path):
    # Crear datasets de prueba
    df = pd.DataFrame({
        "A": [1, 2, 3],
        "B": [4, 5, 6]
    })

    # Crear archivos temporales
    csv_path = tmp_path / "data.csv"
    excel_path = tmp_path / "data.xlsx"
    parquet_path = tmp_path / "data.parquet"

    df.to_csv(csv_path, index=False)
    df.to_excel(excel_path, index=False)
    df.to_parquet(parquet_path)

    # Crear objetos DatasetFile simulados
    dataset_files = [
        MockDatasetFile(csv_path, FileType.CSV, DatasetType.TRAINING, header=True),
        MockDatasetFile(excel_path, FileType.EXCEL, DatasetType.TESTING, header=True),
        MockDatasetFile(parquet_path, FileType.PARQUET, DatasetType.ALL, header=True),
    ]

    # Ejecutar la función
    result = load_datasets(dataset_files)

    # ---- Verificaciones ----
    assert len(result) == 3
    for item in result:
        assert "data" in item
        assert isinstance(item["data"], pd.DataFrame)
        assert "header" in item
        assert "dataset_type" in item
        assert item["data"].equals(df)


def test_load_datasets_filter_by_type(tmp_path: Path):
    """Verifica que filtra correctamente por tipo de archivo"""
    df = pd.DataFrame({"x": [1, 2]})
    csv_path = tmp_path / "filtered.csv"
    df.to_csv(csv_path, index=False)

    dataset_files = [
        MockDatasetFile(csv_path, FileType.CSV, DatasetType.TRAINING)
    ]

    # Solo se incluyen Excel -> debería quedar vacío
    result = load_datasets(dataset_files, fileTypes=[FileType.EXCEL])
    assert result == []


def test_load_datasets_filter_by_dataset_type(tmp_path: Path):
    """Verifica que filtra correctamente por tipo de dataset"""
    df = pd.DataFrame({"x": [1, 2]})
    csv_path = tmp_path / "filtered.csv"
    df.to_csv(csv_path, index=False)

    dataset_files = [
        MockDatasetFile(csv_path, FileType.CSV, DatasetType.TRAINING)
    ]

    # Solo aceptamos TESTING -> no debería cargar nada
    result = load_datasets(dataset_files, datasetTypes=[DatasetType.TESTING])
    assert result == []
    
def test_load_datasets_invalid_type(tmp_path: Path):
    """Verifica que lanza error si el tipo de archivo no es soportado"""
    df = pd.DataFrame({"x": [1, 2]})
    fake_path = tmp_path / "invalid.txt"
    df.to_csv(fake_path, index=False)

    class NotImplementedType:
        pass

    fake_type = NotImplementedType()

    dataset_files = [
        MockDatasetFile(fake_path, fake_type, DatasetType.TRAINING)
    ]

    with pytest.raises(ValueError, match="Unsupported file type"):
        load_datasets(dataset_files, fileTypes=[fake_type])
