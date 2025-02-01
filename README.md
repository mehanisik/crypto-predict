# Cryptocurrency Price Prediction System

![Python](https://img.shields.io/badge/Python-3.9+-black)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.12+-black)
![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black)
![React.js](https://img.shields.io/badge/React.js-19.0.0-black)
![License](https://img.shields.io/badge/License-MIT-black)

A full-stack system for cryptocurrency price prediction with real-time training monitoring and forecasting capabilities.

## Architecture Overview

### Server Stack (`/server`)

- **Core Framework**: Flask 2.3 + Gunicorn
- **Machine Learning**: TensorFlow 2.12, Keras
- **Data Processing**: Pandas, NumPy, yfinance
- **Real-time Communication**: Flask-SocketIO 5.3, Redis 4.5
- **Visualization**: Matplotlib, Seaborn
- **Utilities**: structlog, Pydantic, Joblib
- **Containerization**: Docker, docker-compose

### Client Stack (`/client`)

- **Framework**: Next.js 15 (App Router)
- **UI Components**: Shadcn UI
- **Visualization**: Recharts
- **Styling**: Tailwind CSS + CSS Modules
- **API Client**: Axios
- **WebSocket Communication**: Socket.IO Client
- **Form Handling**: React Hook Form
- **Type Safety**: TypeScript 5.3

## System Features

### Server Capabilities

- Model training pipeline supporting CNN, LSTM, CNN-LSTM, and LSTM-CNN architectures
- Real-time WebSocket updates during training
- Historical price data fetching from Yahoo Finance
- Model persistence and versioning
- Prediction API with confidence intervals
- Comprehensive training metrics (MAE, RMSE, R²)

### Client Features

- Real-time training progress dashboard
- Interactive price prediction charts
- Model configuration interface
- Historical performance comparison
- WebSocket connection management
- Responsive, mobile-first UI
- Dark/Light theme toggle

## Development Setup

### Prerequisites

- Docker 24.0+ and docker-compose
- Node.js 18.x + npm 9.x
- Python 3.9+ with pip

### Installation

```bash
git clone https://github.com/mhanifiisik/crypto-predict.git
cd crypto-predict

# Server setup
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Client setup
cd ../client
bun install
```

### Running with Docker

```bash
docker-compose up --build
```

### Environment Configuration

#### Server (`.env`)

```env
FLASK_ENV=production
REDIS_URL=redis://redis:6379/0
MODEL_SAVE_PATH=models/
```

#### Client (`.env.local`)

```env
NEXT_PUBLIC_BASE_URL=http://localhost:5000
```

## Project Structure

```
├── client/                # Next.js 15 Frontend
│   ├── app/               # App router
│   │   ├── dashboard/     # Main dashboard page
│   │   │   └── page.tsx
│   │   ├── layout.tsx     # Root layout
│   │   └── not-found.tsx  # 404 page
│   ├── components/        # UI Components
│   │   ├── charts/        # Recharts components
│   │   ├── training/      # Training progress visuals
│   │   ├── widgets/       # Dashboard widgets
│   │   └── ui/            # Shadcn/ui components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utility functions
│   │   ├── api.ts         # Axios client
│   │   └── websocket.ts   # Socket.IO client
│   ├── schemas/           # Form schemas (Zod)
│   ├── types/             # TypeScript definitions
│   ├── styles/            # Tailwind CSS
│   └── public/            # Static assets
│
├── server/                # Flask Backend
│   ├── ml_app/            # Core ML Logic
│   │   ├── config.py      # Model configurations
│   │   ├── predictor.py   # Training pipeline
│   │   ├── models/        # Model architectures (CNN, LSTM, Hybrid)
│   │   ├── data/          # Data processing
│   │   └── visualization/ # Analytical visuals
│   ├── app.py             # Flask entry point
│   ├── docker-compose.yml # Redis configuration
│   ├── Dockerfile
│   └── requirements.txt   # Python dependencies
│
└── optuna/                # Hyperparameter optimization
```

## License

Distributed under the MIT License. See `LICENSE` for more information.
