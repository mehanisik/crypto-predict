# CryptoPredict Client Dashboard

A modern, real-time cryptocurrency prediction dashboard built with Next.js, TypeScript, and Tailwind CSS. The dashboard provides real-time machine learning model training progress, predictions, and market analytics through WebSocket communication with the CryptoPredict server.

## 🚀 Features

### Real-Time Training Progress
- **Live WebSocket Updates**: Real-time progress tracking for ML model training
- **Detailed Pipeline Stages**: Monitor each step of the data pipeline:
  - Data fetching and retrieval
  - Data preprocessing and cleaning
  - Feature engineering
  - Model building and configuration
  - Training progress with metrics
  - Model evaluation
  - Visualization generation
- **Training Metrics**: Real-time display of accuracy, loss, R² score, and epoch progress
- **Session Management**: Track multiple training sessions with unique session IDs

### Interactive Dashboard Components
- **Market Overview Widget**: Real-time cryptocurrency market data
- **ML Model Status Widget**: Live training progress and model health
- **Technical Analysis Widget**: Chart-based technical indicators
- **Training Form**: Configure and start new model training sessions
- **Prediction Form**: Generate price predictions using trained models
- **Market Statistics**: Overview of total predictions, active models, and accuracy metrics

### Server Integration
- **Direct API Communication**: No Next.js API routes - direct communication with Flask server
- **WebSocket Real-Time Updates**: Socket.IO for live training progress
- **Connection Health Monitoring**: Automatic reconnection and health scoring
- **Error Handling**: Graceful error handling and user feedback

## 🏗️ Architecture

### Frontend Stack
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern component library
- **Socket.IO Client**: Real-time WebSocket communication
- **Lucide React**: Icon library

### Backend Integration
- **Flask Server**: Python-based ML training server
- **WebSocket Events**: Real-time training progress updates
- **RESTful APIs**: Training and prediction endpoints
- **Session Management**: Room-based WebSocket communication

## 📡 API Endpoints

The dashboard communicates directly with the Flask server at `http://localhost:5000`:

### Training Endpoints
- `POST /api/v1/train` - Start a new training session
- `GET /api/v1/train/running` - Get active training sessions
- `GET /api/v1/train/{session_id}/status` - Get training status
- `POST /api/v1/train/{session_id}/cancel` - Cancel training

### Prediction Endpoints
- `POST /api/v1/predict` - Generate price predictions

### Health Endpoints
- `GET /api/v1/health` - Server health status

## 🔌 WebSocket Events

The dashboard listens for real-time events from the server:

### Training Events
- `data_fetching` - Data fetching started
- `data_fetched` - Data fetched successfully
- `preprocessing` - Data preprocessing started
- `feature_engineering` - Feature engineering in progress
- `model_building` - Model building started
- `model_info` - Model configuration details
- `training_update` - Training progress updates
- `evaluating_update` - Model evaluation in progress
- `visualizing_update` - Visualization generation

### Connection Events
- `connect` - WebSocket connected
- `disconnect` - WebSocket disconnected
- `joined_training` - Joined training room
- `left_training` - Left training room

## 🎯 Dashboard Components

### Main Dashboard (`/dashboard`)
The main dashboard page provides a comprehensive view of all system components:

#### Layout
- **Header**: WebSocket connection status and dashboard title
- **Training Status**: Live training progress card (when active)
- **Three-Column Layout**:
  - **Left Column**: Market overview and training form
  - **Center Column**: ML model widget and prediction form
  - **Right Column**: Market statistics, running trainings, and prediction results

#### Key Features
- **Real-Time Updates**: All components update automatically via WebSocket
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Error Handling**: Graceful error display and recovery
- **Loading States**: Proper loading indicators for all async operations

### ML Model Widget
Displays real-time machine learning model status:

#### Features
- **Connection Status**: WebSocket connection indicator
- **Current Stage**: Active pipeline stage with progress
- **Training Metrics**: Epoch, loss, accuracy, R² score
- **Data Pipeline Info**: Rows, train/test samples, features
- **Model Configuration**: Type, epochs, batch size, learning rate
- **Session Tracking**: Active training session ID
- **Completion Status**: Success/failure indicators

### Training Form
Configure and start new model training sessions:

#### Parameters
- **Ticker**: Cryptocurrency symbol (e.g., BTC-USD)
- **Model Type**: LSTM, CNN, CNN-LSTM, LSTM-CNN
- **Date Range**: Start and end dates for training data
- **Hyperparameters**: Lookback, epochs, batch size, learning rate

### Prediction Form
Generate price predictions using trained models:

#### Features
- **Ticker Selection**: Choose cryptocurrency
- **Prediction Period**: Number of days to predict
- **Real-Time Results**: Display prediction results with confidence scores

## 🔧 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- CryptoPredict server running on port 5000

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🧪 Testing

### Integration Testing
The dashboard includes comprehensive integration tests:

```bash
# Test WebSocket connection and API endpoints
node test-training-socket.js
```

### Manual Testing
1. **Start the server**: Ensure the Flask server is running on port 5000
2. **Start the client**: Run `npm run dev`
3. **Navigate to dashboard**: Visit `http://localhost:3000/dashboard`
4. **Test training**: Start a new training session and monitor real-time progress
5. **Test predictions**: Generate predictions using trained models

## 🎨 UI/UX Features

### Design System
- **Consistent Color Scheme**: Green for success, red for errors, blue for info
- **Loading States**: Spinners and skeleton loaders
- **Progress Indicators**: Real-time progress bars and percentages
- **Status Badges**: Clear status indicators for different states
- **Responsive Grid**: Adaptive layout for different screen sizes

### User Experience
- **Real-Time Feedback**: Immediate updates for all user actions
- **Error Recovery**: Automatic reconnection and error handling
- **Intuitive Navigation**: Clear component hierarchy and organization
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🔒 Security

### WebSocket Security
- **CORS Configuration**: Proper CORS setup for WebSocket connections
- **Session Isolation**: Room-based communication prevents data leakage
- **Error Handling**: Graceful handling of connection failures

### API Security
- **Input Validation**: Client-side validation for all form inputs
- **Error Boundaries**: React error boundaries for component failures
- **Type Safety**: TypeScript ensures type safety across the application

## 📊 Performance

### Optimization
- **WebSocket Efficiency**: Efficient event handling and cleanup
- **Component Optimization**: React.memo and useMemo for expensive operations
- **Bundle Optimization**: Tree shaking and code splitting
- **Image Optimization**: Next.js automatic image optimization

### Monitoring
- **Connection Health**: Real-time connection quality monitoring
- **Performance Metrics**: Training progress and timing metrics
- **Error Tracking**: Comprehensive error logging and reporting

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Environment Configuration
Ensure production environment variables are set:
```env
NEXT_PUBLIC_API_URL=https://your-server-domain.com
NEXT_PUBLIC_WS_URL=https://your-server-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the server logs for backend issues
2. Check browser console for frontend issues
3. Verify WebSocket connection status
4. Ensure all environment variables are set correctly

---

**CryptoPredict Dashboard** - Real-time cryptocurrency prediction with machine learning
