FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY frontend/ frontend/

WORKDIR /app/backend

RUN mkdir -p /app/backend/staticfiles /app/backend/media
RUN python manage.py collectstatic --noinput || true

EXPOSE $PORT

CMD python manage.py migrate --noinput && python manage.py createsuperuser --noinput || true && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
