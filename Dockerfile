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

EXPOSE $PORT

CMD python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py seed_areas && (python manage.py createsuperuser --noinput || true) && python manage.py shell -c "from apps.users.models import User; u=User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').first(); u and setattr(u,'role','admin') or None; u and u.save()" && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
