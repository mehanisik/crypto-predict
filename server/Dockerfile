# Use official Python runtime as a base image
FROM python:3.9-slim

# Set working directory in the container
WORKDIR /app

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Gunicorn
RUN pip install gunicorn eventlet

# Copy the rest of the application
COPY . .

# Create directory for model storage
RUN mkdir -p models

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PORT=5000
ENV REDIS_URL=redis://redis:6379/0

# Expose the port the app runs on
EXPOSE 5000

# Create a non-root user and switch to it
RUN useradd -m myuser
RUN chown -R myuser:myuser /app
USER myuser

# Command to run the application
CMD ["gunicorn", "--config", "gunicorn_config.py", "--worker-class", "eventlet", "app:app"] 