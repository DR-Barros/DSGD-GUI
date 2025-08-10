from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum


class FileType(enum.Enum):
    CSV = "csv"
    EXCEL = "excel"
    PARQUET = "parquet"

    def __str__(self):
        return self.value

class DatasetType(enum.Enum):
    TRAINING = "training"
    TESTING = "testing"
    ALL = "all"

    def __str__(self):
        return self.value

class DatasetFile(Base):
    __tablename__ = "dataset_files"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    file_path = Column(String, nullable=False)
    type_file = Column(Enum(FileType), nullable=False)
    dataset_type = Column(Enum(DatasetType), nullable=False)

    dataset = relationship("Datasets", back_populates="files")
