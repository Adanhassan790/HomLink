FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create static and media directories
RUN mkdir -p /app/staticfiles /app/media

# Run migrations and collect static on startup
RUN python manage.py collectstatic --noinput || true

EXPOSE $PORT

CMD python manage.py migrate --noinput && python manage.py createsuperuser --noinput || true && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
