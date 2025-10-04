# DSGD-GUI

Una interfaz gráfica web para el clasificador Dempster-Shafer Gradient Descent (DSGD). Esta aplicación proporciona una interfaz intuitiva para entrenar, gestionar y evaluar modelos DSGD con soporte para múltiples conjuntos de datos y experimentos.

## 🌐 Idiomas Disponibles

- [English](README.md)
- [Español](README.es.md)

## 🚀 Características

- **Gestión de Conjuntos de Datos**: Carga, visualiza y gestiona archivos CSV para experimentos de aprendizaje automático
- **Entrenamiento de Modelos**: Entrena modelos DSGD con parámetros e hiperparámetros personalizables
- **Seguimiento de Experimentos**: Crea y gestiona múltiples experimentos con diferentes configuraciones
- **Visualización en Tiempo Real**: Ve el progreso del entrenamiento y métricas de rendimiento del modelo
- **Autenticación de Usuarios**: Sistema seguro de registro e inicio de sesión de usuarios
- **Soporte Multiidioma**: Interfaz disponible en múltiples idiomas
- **Gráficos Interactivos**: Visualiza el rendimiento del modelo y los datos con Chart.js

## 🏗️ Arquitectura

Este proyecto consta de dos componentes principales:

### Backend (FastAPI)
- **Framework**: FastAPI 
- **Base de Datos**: SQLite con SQLAlchemy ORM
- **Autenticación**: Autenticación basada en JWT con hash de contraseñas bcrypt
- **Motor ML**: Implementación DSGD para aprendizaje automático distribuido
- **API**: API RESTful con documentación automática OpenAPI

### Frontend (React + TypeScript)
- **Framework**: React 18 con TypeScript
- **Librería UI**: Material-UI (MUI) para diseño moderno y responsivo
- **Herramienta de Construcción**: Vite para desarrollo y construcción rápidos
- **Enrutamiento**: React Router para navegación
- **Gráficos**: Chart.js y react-chartjs-2 para visualización de datos
- **Internacionalización**: i18next para soporte multiidioma

## 📋 Prerrequisitos

- Python 3.11 o superior
- Node.js 16 o superior
- Gestor de paquetes npm o yarn

## 🛠️ Instalación

### Configuración del Backend

1. Navega al directorio del backend:
```bash
cd back
```

2. Crea un entorno virtual:
```bash
python -m venv venv
```

3. Activa el entorno virtual:
```bash
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate
```

4. Instala las dependencias:
```bash
pip install -r requirements.txt
```

5. Crea un archivo `.env` con tu configuración (copia desde `.env.example`)

### Configuración del Frontend

1. Navega al directorio del frontend:
```bash
cd front
```

2. Instala las dependencias:
```bash
npm install
```

## 🚀 Ejecutar la Aplicación

### Iniciar el Backend

```bash
cd back
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en `http://localhost:8000`
La documentación de la API estará disponible en `http://localhost:8000/docs`

### Iniciar el Frontend

```bash
cd front
npm run dev
```

La aplicación web estará disponible en `http://localhost:5173`

## 📖 Uso

1. **Registro/Inicio de Sesión**: Crea una cuenta o inicia sesión para acceder a la aplicación
2. **Cargar Conjunto de Datos**: Sube archivos CSV o Excel que contengan tus datos de entrenamiento
3. **Crear Experimento**: Configura nuevos experimentos con parámetros específicos
4. **Entrenar Modelos**: Configura y entrena modelos DSGD en tus conjuntos de datos
5. **Ver Resultados**: Monitorea el progreso del entrenamiento y analiza el rendimiento del modelo
6. **Hacer Predicciones**: Usa modelos entrenados para hacer predicciones sobre datos nuevos

## 🔧 Endpoints de la API

El backend proporciona varios endpoints de API:

- `/dsgd/api/auth/` - Autenticación (login, registro)
- `/dsgd/api/datasets/` - Gestión de conjuntos de datos
- `/dsgd/api/experiments/` - Operaciones de experimentos
- `/dsgd/api/train/` - Entrenamiento de modelos
- `/dsgd/api/predict/` - Predicciones de modelos
- `/dsgd/api/rules/` - Gestión de reglas

