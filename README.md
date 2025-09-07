# Crypto Predict

A comprehensive cryptocurrency price prediction system using machine learning models with real-time training capabilities and interactive dashboards.

## Overview

Crypto Predict is a full-stack application that leverages multiple machine learning architectures to predict cryptocurrency prices. The system features real-time model training, WebSocket-based progress tracking, and an interactive dashboard for monitoring predictions and model performance.

## Key Features

**Machine Learning**
• Multiple model architectures: CNN, LSTM, CNN-LSTM, and LSTM-CNN
• Real-time training with progress tracking
• Comprehensive metrics: R², MAE, RMSE, MAPE
• Automated hyperparameter optimization

**Real-time Capabilities**
• WebSocket-based training progress updates
• Live prediction streaming
• Interactive dashboard with real-time charts
• Automatic reconnection handling

**Production Ready**
• PostgreSQL database with migrations
• Redis caching and message queuing
• Prometheus monitoring and Grafana dashboards
• Docker containerization
• Rate limiting and security features

## Tech Stack

### Backend
• **Framework**: Flask 2.3.3 with Gunicorn
• **Machine Learning**: TensorFlow 2.12, Keras
• **Database**: PostgreSQL with SQLAlchemy and Alembic
• **Real-time**: Flask-SocketIO with Redis
• **Background Tasks**: Celery with Redis broker
• **Monitoring**: Prometheus metrics
• **Logging**: Structured logging with structlog

### Frontend
• **Framework**: Next.js 15 with App Router
• **Language**: TypeScript 5.3
• **UI**: Shadcn UI with Radix primitives
• **Styling**: Tailwind CSS
• **Charts**: Plotly.js and Recharts
• **WebSocket**: Socket.IO client
• **Package Manager**: Bun

## Quick Start

### Prerequisites
• Docker 24.0+ and docker-compose
• Node.js 18.x+ (for local development)
• Bun (recommended for client development)

### Docker Setup
```bash
git clone https://github.com/mhanifiisik/crypto-predict.git
cd crypto-predict/server
docker-compose up -d
```

**Services:**
• Client Dashboard: http://localhost:3001
• Server API: http://localhost:5000
• Grafana: http://localhost:3000 (admin/admin)
• Prometheus: http://localhost:9090

### Development Setup
```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run
```

```bash
cd client
bun install
bun dev
```

## API Reference

### REST Endpoints
```
GET  /api/v1/health
POST /api/v1/predict
POST /api/v1/train
GET  /api/v1/train/<id>/status
DEL  /api/v1/train/<id>/cancel
GET  /api/v1/train/running
GET  /metrics
```

### WebSocket Events
```
connect/disconnect
join_training/leave_training
join_prediction/leave_prediction
training_update
prediction_update
error_update
```

## Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://redis:6379/0
BROKER_URL=redis://redis:6379/1
RESULT_BACKEND=redis://redis:6379/2
RATELIMIT_STORAGE_URL=redis://redis:6379/3
PROMETHEUS_MULTIPROC_DIR=/tmp
```

## Monitoring

### Metrics
• `crypto_predict_flask_http_request_total` - Request counts by status
• `crypto_predict_flask_http_request_duration_seconds` - Request duration histograms
• `crypto_predict_flask_info` - Application information

### Dashboards
• Real-time request monitoring
• Response time percentiles
• Error rate tracking
• Custom application metrics

## Testing

### Backend Tests
```bash
cd server
python -m pytest
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/metrics
```

### WebSocket Debug
```bash
cd server
node websocket-debug.js
```

## Troubleshooting

### Common Issues
1. **WebSocket Connection Errors**: Ensure Redis is running and Socket.IO is properly configured
2. **Database Connection**: Verify PostgreSQL credentials and SSL settings
3. **Rate Limiting**: Check Redis connection for rate limiter storage
4. **Celery Workers**: Monitor Celery logs for task execution issues

### Logs
```bash
docker-compose logs -f
docker-compose logs -f app
docker-compose logs -f celery
docker-compose logs -f redis
```

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Disclaimer

This system is designed for educational and research purposes. Cryptocurrency predictions should not be used as financial advice.
