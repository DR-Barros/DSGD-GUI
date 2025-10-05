from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class Datasets(Base):
    """
    Modelo que representa un conjunto de datos (dataset) disponible para los usuarios
    dentro del sistema.

    Esta clase define la estructura de la tabla `datasets`, la cual almacena
    información sobre los datasets cargados por los usuarios, incluyendo sus
    metadatos, columnas, cantidad de registros y variables objetivo.

    Atributos:
        id (int): Identificador único del dataset. Clave primaria.
        name (str): Nombre asignado al dataset.
        created_at (datetime): Fecha y hora en que se creó o cargó el dataset.
        user_id (int): Clave foránea que referencia al usuario propietario (`users.id`).

        columns (dict): Estructura JSON con las columnas y sus tipos de datos.
        target_column (str): Nombre de la columna objetivo utilizada para entrenamiento.
        n_rows (int): Número de registros contenidos en el dataset.
        n_classes (int): Número de clases o categorías de la variable objetivo.
        columns_encoder (dict): Codificación aplicada a las columnas categóricas (opcional).

    Relaciones:
        user (User): Usuario propietario del dataset. 
        files (DatasetFile): Archivos asociados al dataset.
        experiment (Experiment): Experimentos que utilizan este dataset.
    """
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    columns = Column(JSON, nullable=False)
    target_column = Column(String, nullable=False)
    n_rows = Column(Integer, nullable=False)
    n_classes = Column(Integer, nullable=False)
    columns_encoder = Column(JSON, default=None)

    user = relationship("User", back_populates="datasets")
    files = relationship("DatasetFile", back_populates="dataset")
    experiment = relationship("Experiment", back_populates="datasets")
