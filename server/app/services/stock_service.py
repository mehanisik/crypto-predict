import time
from threading import Thread
from app.models.stock_model import StockPredictionModel
from app.utils.helpers import EnhancedModelTracker
from app import socketio

def train_model(task_id, params):
    tracker = EnhancedModelTracker(task_id)
    model = StockPredictionModel(**params)

    # Steps: Fetch data, preprocess, train, evaluate
    try:

        socketio.emit(f'status_{task_id}', {'status': 'Loading required libraries...'})

        # Data fetching stage with animation
        socketio.emit(f'status_{task_id}', {'status': 'Initiating data fetch...'})
        model.fetch_data()
        tracker.data_analysis(model.data)
        
        # Preprocessing stage with animation
        normalized_data = (model.data['Close'] - model.data['Close'].mean()) / model.data['Close'].std()
        tracker.preprocessing(model.data, normalized_data)
        model.preprocess_data()
        
        # Feature engineering stage with animation
        tracker.feature_engineering(model.X_train, model.y_train)
        
        # Model building and training
        socketio.emit(f'status_{task_id}', {'status': 'Building model architecture...'})
        time.sleep(1)
        model.build_model()
        
        socketio.emit(f'status_{task_id}', {'status': 'Training started...'})
        model.train(tracker=tracker)
        
        # Evaluation
        socketio.emit(f'status_{task_id}', {'status': 'Evaluating model performance...'})
        mae, r2, rmse = model.evaluate()
        
        socketio.emit(f'results_{task_id}', {
            'status': 'completed',
            'metrics': {
                'mae': float(mae),
                'r2': float(r2),
                'rmse': float(rmse)
            }
        })

    except Exception as e:
        tracker.socketio.emit_error(str(e))
