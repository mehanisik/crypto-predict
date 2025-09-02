from tensorflow.keras import Sequential
from tensorflow.keras.layers import (
    Conv1D,
    MaxPooling1D,
    LSTM,
    Dropout,
    Dense,
    LeakyReLU,
    BatchNormalization
)
from .base import BaseModel

class CNNLSTMModel(BaseModel):
    def build(self, input_shape: tuple) -> Sequential:
        """
        Build a CNN-LSTM hybrid model according to the specified architecture.
        
        Architecture:
        1. Input Layer: Input shape (lookback, features) - e.g., (30, 5) for OHLCV
        2. Convolution Layer: Conv1D with 64 filters, kernel_size=3, ReLU activation
        3. Batch Normalization + MaxPooling1D + Dropout
        4. LSTM Layers: First LSTM(100) -> Second LSTM(50)
        5. Dense Layers: Dense(32) -> Dense(1)
        
        Expected parameters:
        - Conv1D: 768 parameters
        - MaxPooling1D: 0 parameters
        - LSTM: 35,800 parameters
        - Dense layers: 1,275 + 26 = 1,301 parameters
        - Total: ~37,869 parameters
        """
        model = Sequential([
            # Convolution Layer
            Conv1D(
                filters=64,
                kernel_size=3,
                activation='relu',
                input_shape=input_shape,
                padding='same'
            ),
            BatchNormalization(),
            MaxPooling1D(pool_size=2, padding='same'),
            Dropout(0.2),
            
            # LSTM Layers
            LSTM(units=100, return_sequences=True),
            Dropout(0.2),
            LSTM(units=50, return_sequences=False),
            Dropout(0.2),
            
            # Dense Layers
            Dense(units=32, activation='relu'),
            Dense(units=1)
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse'  # Changed to MSE as specified
        )
        return model
