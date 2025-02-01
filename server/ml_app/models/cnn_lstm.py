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
        Build a CNN-LSTM hybrid model.
        CNN layers extract features, followed by LSTM layers for temporal patterns.
        """
        model = Sequential([
            # First CNN Block
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
            
            # Second CNN Block
            Conv1D(filters=128, kernel_size=3, activation='relu', padding='same'),
            BatchNormalization(),
            MaxPooling1D(pool_size=2, padding='same'),
            Dropout(0.2),
            
            # LSTM Layers
            LSTM(units=100, return_sequences=True),
            Dropout(0.2),
            LSTM(units=50, return_sequences=False),
            Dropout(0.2),
            
            # Output Layer
            Dense(units=1),
            LeakyReLU(alpha=0.1)
        ])
        
        model.compile(
            optimizer='adam',
            loss='mae'
        )
        return model
