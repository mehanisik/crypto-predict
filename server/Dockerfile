# Use Python 3.11 slim image for production
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production
ENV FLASK_APP=app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        postgresql-client \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create static directory for plots
RUN mkdir -p /app/static/plots

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app

# Set ulimit for file descriptors
RUN echo "appuser soft nofile 65536" >> /etc/security/limits.conf
RUN echo "appuser hard nofile 65536" >> /etc/security/limits.conf

USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Run the application with increased file descriptor limit
CMD ["sh", "-c", "ulimit -n 65536 && gunicorn --bind 0.0.0.0:5000 --workers 4 --worker-class eventlet --timeout 120 --max-requests 1000 --max-requests-jitter 100 run:app"] 