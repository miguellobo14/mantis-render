FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# api, worker and mcp share this image; docker-compose.yml sets the command for each.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
