# DSGD-GUI

A web-based graphical user interface for Dempster-Shafer Gradient Descent (DSGD) classifier. This application provides an intuitive interface for training, managing, and evaluating DSGD models with support for multiple datasets and experiments.

## 🌐 Available Languages

- [English](README.md)
- [Español](README.es.md)

## 🚀 Features

- **Dataset Management**: Upload, view, and manage CSV datasets for machine learning experiments
- **Model Training**: Train DSGD models with customizable parameters and hyperparameters
- **Experiment Tracking**: Create and manage multiple experiments with different configurations
- **Real-time Visualization**: View training progress and model performance metrics
- **User Authentication**: Secure user registration and login system
- **Multilingual Support**: Interface available in multiple languages
- **Interactive Charts**: Visualize model performance and data insights with Chart.js

## 🏗️ Architecture

This project consists of two main components:

### Backend (FastAPI)
- **Framework**: FastAPI 
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **ML Engine**: DSGD implementation for distributed machine learning
- **API**: RESTful API with automatic OpenAPI documentation

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) for modern, responsive design
- **Build Tool**: Vite for fast development and building
- **Routing**: React Router for navigation
- **Charts**: Chart.js and react-chartjs-2 for data visualization
- **Internationalization**: i18next for multi-language support

## 📋 Prerequisites

- Python 3.11 or higher
- Node.js 16 or higher
- npm or yarn package manager

## 🛠️ Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd back
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file with your configuration

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd front
```

2. Install dependencies:
```bash
npm install
```

## 🚀 Running the Application

### Start the Backend

```bash
cd back
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation will be available at `http://localhost:8000/docs`

### Start the Frontend

```bash
cd front
npm run dev
```

The web application will be available at `http://localhost:5173`

## 📖 Usage

1. **Registration/Login**: Create an account or log in to access the application
2. **Upload Dataset**: Upload CSV or Excel files containing your training data
3. **Create Experiment**: Set up new experiments with specific parameters
4. **Train Models**: Configure and train DSGD models on your datasets
5. **View Results**: Monitor training progress and analyze model performance
6. **Make Predictions**: Use trained models to make predictions on new data

## 🔧 API Endpoints

The backend provides several API endpoints:

- `/dsgd/api/auth/` - Authentication (login, register)
- `/dsgd/api/datasets/` - Dataset management
- `/dsgd/api/experiments/` - Experiment operations
- `/dsgd/api/train/` - Model training
- `/dsgd/api/predict/` - Model predictions
- `/dsgd/api/rules/` - Rule management

