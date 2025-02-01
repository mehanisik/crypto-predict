from tensorflow.keras import Sequential
from tensorflow.keras.layers import (
    Conv1D,
    MaxPooling1D,
    LSTM,
    Dropout,
    Dense,
    LeakyReLU,
    Reshape,
    Flatten,
    BatchNormalization
)
from .base import BaseModel

class LSTMCNNModel(BaseModel):
    def build(self, input_shape: tuple) -> Sequential:
        """
        Build an LSTM-CNN hybrid model.
        LSTM layers process temporal patterns, followed by CNN layers for feature extraction.
        """
        model = Sequential([
            # LSTM Layers
            LSTM(units=100, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            BatchNormalization(),
            
            LSTM(units=50, return_sequences=True),
            Dropout(0.2),
            BatchNormalization(),
            
            # Reshape for CNN (-1 preserves the batch size)
            Reshape((-1, 1, 50)),
            
            # CNN Layers
            Conv1D(filters=64, kernel_size=3, activation='relu', padding='same'),
            BatchNormalization(),
            MaxPooling1D(pool_size=2, padding='same'),
            Dropout(0.2),
            
            Conv1D(filters=32, kernel_size=3, activation='relu', padding='same'),
            BatchNormalization(),
            MaxPooling1D(pool_size=2, padding='same'),
            
            # Flatten and Dense Layers
            Flatten(),
            Dropout(0.2),
            Dense(units=32, activation='relu'),
            BatchNormalization(),
            Dense(units=1),
            LeakyReLU(alpha=0.1)
        ])
        
        model.compile(
            optimizer='adam',
            loss='mae'
        )
        return model 