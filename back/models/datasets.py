from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class Datasets(Base):
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
