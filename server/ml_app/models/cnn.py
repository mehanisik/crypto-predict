from tensorflow.keras import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Dropout, Flatten, Dense, LeakyReLU
from .base import BaseModel

class CNNModel(BaseModel):
    def build(self, input_shape: tuple) -> Sequential:
        model = Sequential([
            Conv1D(filters=32, kernel_size=1, activation='relu', input_shape=input_shape, padding='same'),
            MaxPooling1D(pool_size=1, padding='same'),
            Dropout(0.1),
            Conv1D(filters=32, kernel_size=1, activation='relu', padding='same'),
            MaxPooling1D(padding='same'),
            Flatten(),
            Dense(units=1),
            LeakyReLU(alpha=0.1)
        ])
        
        model.compile(optimizer='adam', loss='mae')
        return model 