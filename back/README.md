# Tests

Ademas de instalar requirements:

```bash
pip install -r requirements.txt
```

Se debe instalar requirements-test
```bash
pip install -r requirements-test.txt
```

1. Ejecutar tests unitarios
pytest tests/

2. Ejecutar tests con reporte de cobertura desde carpeta back
pytest --cov=. --cov-report term-missing tests/