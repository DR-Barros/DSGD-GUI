from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Experiment(Base):
    """
    Modelo que representa un experimento registrado en el sistema.

    Esta clase define la estructura de la tabla `experiments` en la base de datos,
    la cual almacena información sobre los experimentos creados por los usuarios,
    su dataset asociado y las iteraciones realizadas durante el proceso de
    entrenamiento y evaluación.

    Atributos:
        id (int): Identificador único del experimento. Es la clave primaria.
        name (str): Nombre descriptivo del experimento.
        created_at (datetime): Fecha y hora de creación del experimento.
        user_id (int): Identificador del usuario propietario (clave foránea hacia `users.id`).
        dataset_id (int): Identificador del dataset asociado (clave foránea hacia `datasets.id`).

    Relaciones:
        user (User): Usuario que creó el experimento.
        datasets (Datasets): Dataset utilizado en el experimento.
        iterations (Iteration): Iteraciones asociadas al experimento.
    """
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    dataset_id = Column(Integer, ForeignKey('datasets.id'), nullable=False)

    user = relationship("User", back_populates="experiments")
    datasets = relationship("Datasets", back_populates="experiment")
    iterations = relationship("Iteration", back_populates="experiment")
