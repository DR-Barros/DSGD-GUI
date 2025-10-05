from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import Settings

engine = Settings.engine

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()