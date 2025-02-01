from tensorflow.keras import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense, LeakyReLU
from .base import BaseModel

class LSTMModel(BaseModel):
    def build(self, input_shape: tuple) -> Sequential:
        model = Sequential([
            LSTM(units=64, return_sequences=True, input_shape=input_shape),
            Dropout(0.1),
            LSTM(units=32, return_sequences=False),
            Dropout(0.1),
            Dense(units=1),
            LeakyReLU(alpha=0.1)
        ])
        model.compile(optimizer='adam', loss='mae')
        return model 