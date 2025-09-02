--- UPDATE 02.09.2025 ---

I have completed a comprehensive refactor and improvement of the cryptocurrency prediction system. Here are the key improvements made:


### Server-Side Enhancements
- [X] **Structured Logging**: Replaced all triple-quoted comments and test files with proper `structlog` logging
- [X] **Database Migration**: Migrated from SQLite to Neon PostgreSQL with proper Alembic migrations
- [X] **WebSocket Stability**: Fixed persistent Socket.IO connection issues with Redis message queue
- [X] **Rate Limiting**: Added proper rate limiting with Redis storage and exempted critical endpoints
- [X] **Monitoring**: Integrated Prometheus metrics exporter for monitoring and observability
- [X] **Celery Modernization**: Updated to modern Celery configuration keys (removed deprecated settings)
- [X] **API Validation**: Enhanced Marshmallow schemas with better error handling
- [X] **Containerization**: Optimized Docker setup with proper service dependencies

### Client-Side Improvements
- [X] **WebSocket Client**: Implemented custom React hook for WebSocket management
- [X] **Error Handling**: Added comprehensive error handling and reconnection logic
- [X] **UI/UX**: Cleaned up client codebase and improved component structure
- [X] **Real-time Updates**: Fixed training progress updates via WebSocket
- [X] **Package Management**: Migrated to Bun for faster package management

### Machine Learning Enhancements
- [X] **Model Metrics**: Added comprehensive metrics (R², MAE, RMSE, MAPE) for better model evaluation
- [X] **Training Pipeline**: Improved training service with proper progress tracking and database persistence
- [X] **Data Validation**: Enhanced prediction request validation and error handling

## 🚀 Current Features

### Server Capabilities
- **4 ML Models**: CNN, LSTM, CNN-LSTM, and LSTM-CNN architectures
- **Real-time Training**: WebSocket updates during model training with progress tracking
- **Database Integration**: Neon PostgreSQL with proper migrations and data persistence
- **API Endpoints**: Health checks, predictions, training management, and metrics
- **Monitoring**: Prometheus metrics for observability and Grafana dashboards
- **Background Tasks**: Celery workers for async training and processing
- **Rate Limiting**: Intelligent rate limiting with Redis storage
- **Structured Logging**: Event-based logging with proper formatting and context

### Client Features
- **Real-time Dashboard**: Live training progress and model performance monitoring
- **Interactive Charts**: Price prediction visualizations with Plotly.js and Recharts
- **WebSocket Management**: Robust connection handling with automatic reconnection
- **Responsive Design**: Mobile-first UI with Tailwind CSS and Radix UI components
- **Type Safety**: Full TypeScript implementation with proper type definitions
- **Modern Stack**: Next.js 15 with App Router and Bun package manager

## 🏗️ Architecture Overview

### Server Stack (`/server`)
- **Core Framework**: Flask 2.3.3 + Gunicorn with eventlet workers
- **Machine Learning**: TensorFlow 2.12, Keras with custom model architectures
- **Real-time Communication**: Flask-SocketIO 5.3.6 with Redis message queue
- **Database**: PostgreSQL (Neon) with SQLAlchemy and Alembic migrations
- **Caching & Message Broker**: Redis 7 for caching, Celery broker, and Socket.IO
- **Monitoring**: Prometheus metrics exporter with custom labels
- **Containerization**: Docker Compose with proper service orchestration
- **Logging**: structlog for structured, event-based logging

### Client Stack (`/client`)
- **Framework**: Next.js 15 with App Router and TypeScript 5.3
- **UI Components**: Shadcn UI components with Radix UI primitives
- **Visualization**: Plotly.js for interactive charts, Recharts for analytics
- **Styling**: Tailwind CSS with custom design system
- **WebSocket**: Socket.IO client with custom React hooks
- **API Client**: Axios with proper error handling and interceptors
- **Package Manager**: Bun for faster dependency management
- **Form Handling**: React Hook Form with Zod validation

## 🚀 Quick Start

### Prerequisites
- Docker 24.0+ and docker-compose
- Node.js 18.x+ (for local development)
- Bun (recommended for client development)

### Running with Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/mhanifiisik/crypto-predict.git
cd crypto-predict

# Start all services
cd server
docker-compose up -d

# Access the application
# Client: http://localhost:3001
# Server API: http://localhost:5000
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
```

### Local Development
```bash
# Server setup
cd server
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
flask run

# Client setup
cd ../client
bun install
bun dev
```

## 📊 API Endpoints

### Core Endpoints
- `GET /api/v1/health` - Health check with service status
- `POST /api/v1/predict` - Generate price predictions
- `POST /api/v1/train` - Start model training
- `GET /api/v1/train/<session_id>/status` - Training status
- `DELETE /api/v1/train/<session_id>/cancel` - Cancel training
- `GET /api/v1/train/running` - List running training sessions
- `GET /metrics` - Prometheus metrics (exempt from rate limiting)

### WebSocket Events
- `connect` / `disconnect` - Connection management
- `join_training` / `leave_training` - Training room management
- `join_prediction` / `leave_prediction` - Prediction room management
- `training_update` - Real-time training progress updates
- `prediction_update` - Real-time prediction updates
- `error_update` - Error notifications

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Redis
REDIS_URL=redis://redis:6379/0
BROKER_URL=redis://redis:6379/1
RESULT_BACKEND=redis://redis:6379/2

# Rate Limiting
RATELIMIT_STORAGE_URL=redis://redis:6379/3

# Monitoring
PROMETHEUS_MULTIPROC_DIR=/tmp
```

## 📈 Monitoring & Observability

### Prometheus Metrics
- `crypto_predict_flask_http_request_total` - Request counts by status
- `crypto_predict_flask_http_request_duration_seconds` - Request duration histograms
- `crypto_predict_flask_info` - Application information

### Grafana Dashboards
- Real-time request monitoring
- Response time percentiles
- Error rate tracking
- Custom application metrics

## 🧪 Testing

### Server Testing
```bash
cd server
# Run all tests
python -m pytest

# Test specific endpoints
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/metrics
```

### WebSocket Testing
```bash
# Use the provided debug script
cd server
node websocket-debug.js
```

## 🔍 Troubleshooting

### Common Issues
1. **WebSocket Connection Errors**: Ensure Redis is running and Socket.IO is properly configured
2. **Database Connection**: Verify Neon PostgreSQL credentials and SSL settings
3. **Rate Limiting**: Check Redis connection for rate limiter storage
4. **Celery Workers**: Monitor Celery logs for task execution issues

### Logs
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f celery
docker-compose logs -f redis
```

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Note**: This system is designed for educational and research purposes. Cryptocurrency predictions should not be used as financial advice.
