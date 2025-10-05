from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from database import Base
import enum


class FileType(enum.Enum):
    """
    Enumeración de tipos de archivos soportados para los datasets.
    
    Atributos:
        CSV: Archivo CSV.
        EXCEL: Archivo Excel.
        PARQUET: Archivo Parquet.
    """
    CSV = "csv"
    EXCEL = "excel"
    PARQUET = "parquet"

    def __str__(self):
        return self.value

class DatasetType(enum.Enum):
    """
    Enumeración de tipos de dataset según su uso en entrenamiento o prueba.
    
    Atributos:
        TRAINING: Dataset utilizado para entrenamiento.
        TESTING: Dataset utilizado para prueba.
        ALL: Dataset completo (sin separación).
    """
    TRAINING = "training"
    TESTING = "testing"
    ALL = "all"

    def __str__(self):
        return self.value

class DatasetFile(Base):
    """
    Modelo que representa un archivo asociado a un dataset.

    Esta clase define la tabla `dataset_files` y almacena la información de
    cada archivo cargado, incluyendo su ruta, tipo de archivo y su función
    dentro del dataset (entrenamiento, prueba o completo).

    Atributos:
        id (int): Identificador único del archivo. Clave primaria.
        dataset_id (int): Clave foránea que referencia al dataset al que pertenece (`datasets.id`).
        file_path (str): Ruta en el sistema donde se encuentra almacenado el archivo.
        type_file (FileType): Tipo de archivo (CSV, Excel, Parquet).
        dataset_type (DatasetType): Tipo de dataset según su uso (TRAINING, TESTING, ALL).
        header (bool): Indica si el archivo incluye fila de encabezado.

    Relaciones:
        dataset (Datasets): Dataset al que pertenece el archivo. Relación muchos a uno.
    """
    __tablename__ = "dataset_files"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    file_path = Column(String, nullable=False)
    type_file = Column(Enum(FileType), nullable=False)
    dataset_type = Column(Enum(DatasetType), nullable=False)
    header = Column(Boolean, nullable=False)

    dataset = relationship("Datasets", back_populates="files")
