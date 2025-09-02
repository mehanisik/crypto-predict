from tensorflow.keras import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Dropout, Flatten, Dense, LeakyReLU, BatchNormalization
from .base import BaseModel

class CNNModel(BaseModel):
    def build(self, input_shape: tuple) -> Sequential:
        """
        Build an improved CNN model for time series prediction.
        
        Architecture:
        1. Input Layer: (lookback, features) - represents consecutive days with multiple features
        2. First Conv1D: 64 filters, kernel_size=3, ReLU activation
        3. BatchNormalization + MaxPooling1D + Dropout
        4. Second Conv1D: 128 filters, kernel_size=3, ReLU activation  
        5. BatchNormalization + MaxPooling1D + Dropout
        6. Flatten layer
        7. Dense layers: 64 -> 32 -> 1 units
        """
        model = Sequential([
            # First Convolution Block
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
            
            # Second Convolution Block
            Conv1D(
                filters=128, 
                kernel_size=3, 
                activation='relu', 
                padding='same'
            ),
            BatchNormalization(),
            MaxPooling1D(pool_size=2, padding='same'),
            Dropout(0.2),
            
            # Flatten layer
            Flatten(),
            
            # Dense layers
            Dense(units=64, activation='relu'),
            Dropout(0.3),
            Dense(units=32, activation='relu'),
            Dense(units=1),
            LeakyReLU(alpha=0.1)
        ])
        
        model.compile(optimizer='adam', loss='mse')  # Changed to MSE for consistency
        return model 