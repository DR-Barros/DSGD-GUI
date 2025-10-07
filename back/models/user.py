from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    """
    Modelo que representa a un usuario dentro del sistema.

    Esta clase define la estructura de la tabla `users` en la base de datos,
    incluyendo los campos básicos de identificación y autenticación, así como
    las relaciones con los datasets y experimentos asociados al usuario.

    Atributos:
        id (int): Identificador único del usuario.
        name (str): Nombre del usuario.
        email (str): Correo electrónico del usuario. Debe ser único.
        password (str): Contraseña cifrada del usuario.

    Relaciones:
        datasets (Datasets): Conjuntos de datos subidos por el usuario.
        experiments (Experiment): Experimentos creados por el usuario.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)

    datasets = relationship("Datasets", back_populates="user")
    experiments = relationship("Experiment", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")