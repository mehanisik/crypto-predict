from dataclasses import dataclass

@dataclass
class ModelConfig:
    model: str = "CNN"
    lookback: int = 30  # Changed to 30 to match the specification
    epochs: int = 100
    batch_size: int = 32  # Changed to 32 to match the specification
    train_test_split: float = 0.8
    random_seed: int = 42
    ticker: str = "BTC-USD"
    learning_rate: float = 0.001  # Added learning rate
    early_stopping_patience: int = 20  # Added early stopping patience 