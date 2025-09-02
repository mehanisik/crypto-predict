from datetime import datetime, timezone
from app import db
from marshmallow import Schema, fields


class ModelConfiguration(db.Model):
    __tablename__ = 'model_configurations'
    
    id = db.Column(db.Integer, primary_key=True)
    config_hash = db.Column(db.String(128), unique=True, nullable=False, index=True)
    model_type = db.Column(db.String(50), nullable=False, index=True)
    ticker = db.Column(db.String(20), nullable=False, index=True)
    lookback_days = db.Column(db.Integer, nullable=False)
    epochs = db.Column(db.Integer, nullable=False)
    batch_size = db.Column(db.Integer, nullable=False)
    learning_rate = db.Column(db.Float, nullable=False)
    hidden_layers = db.Column(db.JSON)
    dropout_rate = db.Column(db.Float)
    activation_function = db.Column(db.String(50))
    optimizer = db.Column(db.String(50))
    loss_function = db.Column(db.String(50))
    validation_split = db.Column(db.Float)
    early_stopping_patience = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self) -> str:
        return f'<ModelConfiguration {self.model_type} {self.ticker}>'
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'config_hash': self.config_hash,
            'model_type': self.model_type,
            'ticker': self.ticker,
            'lookback_days': self.lookback_days,
            'epochs': self.epochs,
            'batch_size': self.batch_size,
            'learning_rate': self.learning_rate,
            'hidden_layers': self.hidden_layers,
            'dropout_rate': self.dropout_rate,
            'activation_function': self.activation_function,
            'optimizer': self.optimizer,
            'loss_function': self.loss_function,
            'validation_split': self.validation_split,
            'early_stopping_patience': self.early_stopping_patience,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def generate_hash(model_type: str, ticker: str, lookback_days: int, epochs: int, batch_size: int, learning_rate: float) -> str:
        import hashlib
        config_str = f"{model_type}_{ticker}_{lookback_days}_{epochs}_{batch_size}_{learning_rate}"
        return hashlib.sha256(config_str.encode()).hexdigest()
    
    def activate(self) -> None:
        from app.models.model_config import ModelConfiguration
        
        ModelConfiguration.query.filter_by(
            ticker=self.ticker,
            is_active=True
        ).update({'is_active': False})
        
        self.is_active = True
        self.updated_at = datetime.now(timezone.utc)


class ModelConfigurationSchema(Schema):
    id = fields.Int(dump_only=True)
    config_hash = fields.Str(dump_only=True)
    model_type = fields.Str(required=True)
    ticker = fields.Str(required=True)
    lookback_days = fields.Int(required=True)
    epochs = fields.Int(required=True)
    batch_size = fields.Int(required=True)
    learning_rate = fields.Float(required=True)
    hidden_layers = fields.Dict()
    dropout_rate = fields.Float()
    activation_function = fields.Str()
    optimizer = fields.Str()
    loss_function = fields.Str()
    validation_split = fields.Float()
    early_stopping_patience = fields.Int()
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
