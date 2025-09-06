# Final optimized multi-stage Docker build for crypto-predict application
# Stage 1: Build stage with all dependencies
FROM python:3.11-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libc6-dev \
    libffi-dev \
    libssl-dev \
    libpq-dev \
    libjpeg-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install with optimizations
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --compile -r requirements.txt && \
    pip cache purge

# Stage 2: Production stage with minimal dependencies
FROM python:3.11-slim AS production

# Install only essential runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    libpq5 \
    curl \
    libjpeg62-turbo \
    libfreetype6 \
    liblcms2-2 \
    libopenjp2-7 \
    libtiff5 \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /usr/share/man/* /usr/share/doc/*

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set environment variables for optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    FLASK_APP=app \
    PYTHONPATH=/app \
    PYTHONHASHSEED=random \
    PYTHONIOENCODING=utf-8 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Create app directory
WORKDIR /app

# Copy only necessary application files (exclude development files)
COPY app/ ./app/
COPY ml_app/ ./ml_app/
COPY config.py .
COPY run.py .
COPY migrations/ ./migrations/

# Create necessary directories with proper permissions
RUN mkdir -p /app/static/plots /app/logs /app/models && \
    chmod 755 /app/static/plots /app/logs /app/models

# Create non-root user
RUN adduser -D -s /bin/sh appuser && \
    chown -R appuser:appuser /app

# Set file descriptor limits (Alpine doesn't have limits.conf)
RUN echo "* soft nofile 65536" >> /etc/security/limits.conf 2>/dev/null || true && \
    echo "* hard nofile 65536" >> /etc/security/limits.conf 2>/dev/null || true

USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Run the application with optimized settings
CMD ["sh", "-c", "ulimit -n 65536 && gunicorn --bind 0.0.0.0:5000 --workers 4 --worker-class eventlet --timeout 120 --max-requests 1000 --max-requests-jitter 100 --preload run:app"]
