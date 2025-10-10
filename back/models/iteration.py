from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, JSON, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum

class Status(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    STOPPED = "stopped"

    def __str__(self):
        return self.value

class Iteration(Base):
    """
    Modelo que representa una iteración de entrenamiento asociada a un experimento.

    Esta clase define la estructura de la tabla `iterations`, la cual almacena
    los parámetros, estado, resultados y métricas obtenidas durante una ejecución
    de entrenamiento dentro de un experimento.

    Atributos:
        id (int): Identificador único de la iteración. Clave primaria.
        created_at (datetime): Fecha y hora de creación de la iteración.
        experiment_id (int): Clave foránea que referencia al experimento asociado (`experiments.id`).

        trained (bool): Indica si el modelo fue entrenado exitosamente.
        model_path (str): Ruta del modelo entrenado almacenado en disco.
        label_encoder (dict): Mapeo de etiquetas utilizado durante el entrenamiento.

        # Parámetros del dataset
        train_test_split (float): Proporción de división entre entrenamiento y prueba.
        train_test_split_seed (int): Semilla usada para reproducibilidad de la división.
        shuffle (bool): Si los datos fueron barajados antes de dividirse.
        delete_nulls (bool): Indica si se eliminaron valores nulos.
        drop_duplicates (bool): Indica si se eliminaron duplicados.

        # Hiperparámetros de entrenamiento
        min_epochs (int): Número mínimo de épocas de entrenamiento.
        max_epochs (int): Número máximo de épocas de entrenamiento.
        batch_size (int): Tamaño del batch usado en el entrenamiento.
        learning_rate (float): Tasa de aprendizaje del optimizador.
        optimizer (str): Nombre del optimizador utilizado.
        loss_function (str): Función de pérdida utilizada.
        min_dloss (float): Cambio mínimo en la pérdida para considerar convergencia.
        precompute_rules (bool): Si se precomputaron reglas antes del entrenamiento.
        force_precompute (bool): Si se forzó el recálculo de las reglas previas.

        # Estado de entrenamiento
        training_status (str): Estado actual del entrenamiento ("pending", "running", "completed", "failed").
        training_message (str): Mensaje descriptivo del estado o error ocurrido.
        training_start_time (datetime): Hora de inicio del entrenamiento.
        training_end_time (datetime): Hora de finalización del entrenamiento.

        # Métricas de desempeño
        accuracy (float): Exactitud del modelo.
        precision (float): Precisión del modelo.
        recall (float): Recall del modelo.
        f1_score (float): Puntaje F1 del modelo.
        confusion_matrix (dict): Matriz de confusión resultante.
        classification_report (dict): Reporte de clasificación detallado.
        roc_auc (float): Área bajo la curva ROC.

    Relaciones:
        experiment (Experiment): Experimento al que pertenece la iteración.
    """
    __tablename__ = "iterations"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, nullable=False)
    experiment_id = Column(Integer, ForeignKey('experiments.id'), nullable=False)
    trained = Column(Boolean, default=False)
    model_path = Column(String, nullable=True)
    label_encoder =Column(JSON, nullable=True)
    # Hyperparameters for datasets
    train_test_split = Column(Float, nullable=True)
    train_test_split_seed = Column(Integer, nullable=True)
    shuffle = Column(Boolean, default=False)
    delete_nulls = Column(Boolean, default=False)
    drop_duplicates = Column(Boolean, default=False)
    # Hyperparameters for training
    min_epochs = Column(Integer, nullable=True)
    max_epochs = Column(Integer, nullable=True)
    batch_size = Column(Integer, nullable=True)
    learning_rate = Column(Float, nullable=True)
    optimizer = Column(String, nullable=True)
    loss_function = Column(String, nullable=True)
    min_dloss = Column(Float, nullable=True)
    precompute_rules = Column(Boolean, default=False)
    force_precompute = Column(Boolean, default=False)

    # Training status
    training_status = Column(Enum(Status), nullable=True)  # e.g., "pending", "running", "completed", "error"
    training_message = Column(String, nullable=True)  # Message for training status
    training_start_time = Column(DateTime, nullable=True)
    training_end_time = Column(DateTime, nullable=True)

    # Metrics
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    confusion_matrix = Column(JSON, nullable=True)
    classification_report = Column(JSON, nullable=True)
    roc_auc = Column(Float, nullable=True)
    
    # Relationships
    experiment = relationship("Experiment", back_populates="iterations")