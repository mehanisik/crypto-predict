import time
import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from app import socketio



class EnhancedModelTracker:
    def __init__(self, task_id):
        self.task_id = task_id

    def data_analysis(self, data):
        """Animate the data analysis process"""
        # Initial empty plot
        
        socketio.emit(f'status_{self.task_id}', {'status': 'Starting data analysis...'})
        time.sleep(1)  # Brief pause before starting

        fig = go.Figure()
        
        # Gradually add data points to create animation effect
        total_points = len(data)
        chunks = 10  # Number of updates
        chunk_size = total_points // chunks
        
        for i in range(chunks):
            current_slice = slice(0, (i + 1) * chunk_size)
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=data.index[current_slice],
                y=data['Close'][current_slice],
                mode='lines',
                name='Close Price'
            ))
            
            fig.update_layout(
                title=f'Loading Historical Price Data ({(i+1)*10}%)',
                xaxis_title='Date',
                yaxis_title='Price'
            )
            
            # Calculate progressive statistics
            current_data = data['Close'][current_slice]
            stats = {
                'total_days': len(current_data),
                'avg_price': float(current_data.mean()),
                'min_price': float(current_data.min()),
                'max_price': float(current_data.max()),
                'price_volatility': float(current_data.std())
            }
            
            socketio.emit(f'data_fetch_{self.task_id}', {
                'plot': fig.to_json(),
                'stats': stats,
                'timestamp': datetime.date.today().isoformat()
            })
            
            time.sleep(0.5)  # Smooth transition between updates
        
        # Final update with complete data
        socketio.emit(f'status_{self.task_id}', {'status': 'Data analysis completed'})
        time.sleep(1)

    def preprocessing(self, data, normalized_data):
        """Animate the preprocessing visualization"""
        socketio.emit(f'status_{self.task_id}', {'status': 'Starting data preprocessing...'})
        time.sleep(1)

        # Create step-by-step preprocessing visualization
        steps = [
            ('Analyzing raw data distribution...', 0.25),
            ('Calculating normalization parameters...', 0.25),
            ('Applying normalization...', 0.25),
            ('Validating normalized distribution...', 0.25)
        ]

        for step_msg, pause in steps:
            socketio.emit(f'status_{self.task_id}', {'status': step_msg})
            
            fig = make_subplots(rows=2, cols=1,
                              subplot_titles=('Original Price Distribution',
                                            'Normalized Price Distribution'))
            
            fig.add_trace(
                go.Histogram(x=data['Close'], name='Original'),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Histogram(x=normalized_data, name='Normalized'),
                row=2, col=1
            )
            
            fig.update_layout(height=800, title_text="Data Distributions")
            
            stats = {
                'original_mean': float(data['Close'].mean()),
                'original_std': float(data['Close'].std()),
                'normalized_mean': float(normalized_data.mean()),
                'normalized_std': float(normalized_data.std())
            }
            
            socketio.emit(f'preprocessing_{self.task_id}', {
                'plot': fig.to_json(),
                'stats': stats,
                'timestamp': datetime.date.today().isoformat()
            })
            
            time.sleep(pause)

        socketio.emit(f'status_{self.task_id}', {'status': 'Preprocessing completed'})
        time.sleep(1)

    def feature_engineering(self, X_train, y_train):
        """Animate the feature engineering process"""
        socketio.emit(f'status_{self.task_id}', {'status': 'Starting feature engineering...'})
        time.sleep(1)

        steps = [
            ('Creating sequence windows...', 0.3),
            ('Analyzing sequence patterns...', 0.3),
            ('Validating feature structure...', 0.4)
        ]

        for step_msg, pause in steps:
            socketio.emit(f'status_{self.task_id}', {'status': step_msg})
            
            fig = go.Figure()
            
            # Gradually add sequences
            for i in range(min(5, len(X_train))):
                fig.add_trace(go.Scatter(
                    y=X_train[i].flatten(),
                    mode='lines+markers',
                    name=f'Sequence {i+1}'
                ))
                
            fig.update_layout(
                title='Sample Training Sequences',
                xaxis_title='Timestep',
                yaxis_title='Normalized Price'
            )
            
            stats = {
                'num_sequences': len(X_train),
                'sequence_length': X_train.shape[1],
                'min_value': float(X_train.min()),
                'max_value': float(X_train.max()),
                'mean_value': float(X_train.mean())
            }
            
            socketio.emit(f'feature_engineering_{self.task_id}', {
                'plot': fig.to_json(),
                'stats': stats,
                'timestamp': datetime.date.today().isoformat()
            })
            
            time.sleep(pause)

        socketio.emit(f'status_{self.task_id}', {'status': 'Feature engineering completed'})
        time.sleep(1)

    def update_training_progress(self, current_epoch, total_epochs, history=None):
        """Update training progress with smoother transitions"""
        progress = (current_epoch / total_epochs) * 100
        
        update_data = {
            'progress': progress,
            'current_epoch': current_epoch,
            'total_epochs': total_epochs,
            'timestamp': datetime.date.today().isoformat()
        }
        
        if history is not None:
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                y=history,
                mode='lines',
                name='Training Loss'
            ))
            fig.update_layout(
                title='Training Loss Over Time',
                xaxis_title='Epoch',
                yaxis_title='Loss'
            )
            update_data['loss_plot'] = fig.to_json()
        
        socketio.emit(f'training_progress_{self.task_id}', update_data)
        
        # Add small pause between epochs for smoother visualization
        if current_epoch % 5 == 0:  # Add pause every 5 epochs
            time.sleep(0.1)
