from dataclasses import dataclass

@dataclass
class ModelConfig:
    model: str = "CNN"
    lookback: int = 15
    epochs: int = 100
    batch_size: int = 64
    train_test_split: float = 0.8
    random_seed: int = 42
    ticker: str = "BTC-USD" 