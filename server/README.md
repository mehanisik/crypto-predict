# ML Model API Server

![Python](https://img.shields.io/badge/python-3.9%2B-black)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.12%2B-black)
![Docker](https://img.shields.io/badge/Docker-24.0%2B-black)
![License](https://img.shields.io/badge/License-MIT-black)

A production-ready Flask API for cryptocurrency price prediction using deep learning models with real-time training updates via WebSocket.

## Features

- Multiple Model Architectures (CNN, LSTM, Hybrid Models)
- Real-time WebSocket Updates
- 15+ Analytical Visualizations with Plots
- Dockerized application
- Multi-day Price Forecasting
- Comprehensive Metrics (MAE, RMSE, R², MAPE)
- Technical Indicator Integration

## Quick Start

### Docker Deployment

```bash
# Start with Docker Compose
docker-compose up --build

# Verify services
docker-compose ps
```

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Start development server
python -m app.py
```

## API Endpoints

### 🏋️ Train Model

```http
POST /train
```

**Request Body:**

```json
{
  "model": "CNN-LSTM",
  "lookback": 30,
  "epochs": 100,
  "ticker": "BTC-USD",
  "start_date": "2020-01-01",
  "end_date": "2023-01-01"
}
```

**Response:**

```json
{
  "request_id": "20240328153045",
  "status": "success",
  "data": {
    "training_duration": 215.3,
    "metrics": {
      "train": { "mae": 120.5, "rmse": 150.2 },
      "test": { "mae": 145.8, "rmse": 180.3 }
    }
  }
}
```

### 🔮 Make Predictions

```http
POST /predict
```

**Request Body:**

```json
{
  "start_date": "2023-01-01",
  "days": 7,
  "model": "CNN-LSTM"
}
```

**Response:**

```json
{
  "predictions": [
    {
      "day": 1,
      "predicted_price": 42000.5,
      "confidence_interval": 500.25,
      "timestamp": "2023-03-29T00:00:00"
    }
  ]
}
```

### 🩺 Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2023-03-28T15:30:45Z"
}
```

## Real-Time Updates

Listen to WebSocket events during training:

```javascript
const socket = io("http://localhost:5000");

socket.on("training_update", (data) => {
  console.log(`Epoch ${data.epoch}/${data.total_epochs} - Loss: ${data.loss}`);
});

socket.on("visualizing_update", (data) => {
  if (data.plot) {
    document.getElementById("plot").src = `data:image/png;base64,${data.plot}`;
  }
});
```

**Event Types:**

- `training_update`: Epoch progress and metrics
- `evaluating_update`: Validation metrics
- `visualizing_update`: Generated analysis plots

## Model Architectures

| Model        | Key Layers                  | Use Case             |
| ------------ | --------------------------- | -------------------- |
| **CNN**      | 1D Convolution + Pooling    | Pattern Recognition  |
| **LSTM**     | Long Short-Term Memory      | Time Series Analysis |
| **CNN-LSTM** | Convolutional + LSTM Hybrid | Complex Patterns     |
| **LSTM-CNN** | LSTM + Convolutional Hybrid | Sequential Features  |

## Visualization Examples

1. Price Predictions Comparison
2. Training Loss History
3. Bollinger Bands Analysis
4. Residual Error Distribution
5. Momentum Indicators (RSI/MACD)
6. Volume Profile Analysis
7. Prediction Confidence Intervals

![Example Visualization](https://via.placeholder.com/600x400?text=Training+Metrics+Preview)

## Configuration

**Environment Variables:**

```env
CORS_ORIGINS=*
FLASK_ENV=production
REDIS_URL=redis://redis:6379/0
MODEL_SAVE_PATH=models/
```

**Docker Setup:**

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "63790:6379"

  ml-server:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

---
