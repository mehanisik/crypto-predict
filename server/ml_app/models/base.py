from abc import ABC, abstractmethod
from tensorflow import keras

class BaseModel(ABC):
    @abstractmethod
    def build(self, input_shape: tuple) -> keras.Model:
        """Build and return a compiled model."""
        pass 