from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from database import Base

class Iteration(Base):
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
    precompute_rules = Column(Boolean, default=False)
    force_precompute = Column(Boolean, default=False)

    # Training status
    training_status = Column(String, nullable=True)  # e.g., "pending", "running", "completed", "failed"
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