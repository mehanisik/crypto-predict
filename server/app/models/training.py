from datetime import datetime, timezone
from enum import Enum
from app import db
from marshmallow import Schema, fields


class TrainingStatus(Enum):
    PENDING = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    CANCELLED = 'CANCELLED'


class TrainingSession(db.Model):
    __tablename__ = 'training_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    ticker = db.Column(db.String(20), nullable=False, index=True)
    model_type = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    lookback_days = db.Column(db.Integer, nullable=False)
    epochs = db.Column(db.Integer, nullable=False)
    batch_size = db.Column(db.Integer)
    learning_rate = db.Column(db.Float)
    model_config_id = db.Column(db.Integer, db.ForeignKey('model_configurations.id'))
    status = db.Column(db.Enum(TrainingStatus), nullable=False, default=TrainingStatus.PENDING)
    accuracy = db.Column(db.Float)
    loss = db.Column(db.Float)
    r2_score = db.Column(db.Float)
    mae = db.Column(db.Float)
    rmse = db.Column(db.Float)
    mape = db.Column(db.Float)
    model_file_path = db.Column(db.String(255))
    training_logs = db.Column(db.Text)
    started_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self) -> str:
        return f'<TrainingSession {self.session_id} {self.ticker} {self.model_type}>'
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'session_id': self.session_id,
            'ticker': self.ticker,
            'model_type': self.model_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'lookback_days': self.lookback_days,
            'epochs': self.epochs,
            'batch_size': self.batch_size,
            'learning_rate': self.learning_rate,
            'model_config_id': self.model_config_id,
            'status': self.status.value if self.status else None,
            'accuracy': self.accuracy,
            'loss': self.loss,
            'r2_score': self.r2_score,
            'mae': self.mae,
            'rmse': self.rmse,
            'mape': self.mape,
            'model_file_path': self.model_file_path,
            'training_logs': self.training_logs,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def update_status(self, status: TrainingStatus) -> None:
        """Update the training status."""
        self.status = status
        self.updated_at = datetime.now(timezone.utc)
    
    def start(self) -> None:
        """Mark training as started."""
        self.status = TrainingStatus.IN_PROGRESS
        self.started_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
    
    def complete(self, accuracy: float = None, loss: float = None, r2_score: float = None, 
                 mae: float = None, rmse: float = None, mape: float = None) -> None:
        """Mark training as completed."""
        self.status = TrainingStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
        if accuracy is not None:
            self.accuracy = accuracy
        if loss is not None:
            self.loss = loss
        if r2_score is not None:
            self.r2_score = r2_score
        if mae is not None:
            self.mae = mae
        if rmse is not None:
            self.rmse = rmse
        if mape is not None:
            self.mape = mape


class TrainingSessionSchema(Schema):
    id = fields.Int(dump_only=True)
    session_id = fields.Str(required=True)
    ticker = fields.Str(required=True)
    model_type = fields.Str(required=True)
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    lookback_days = fields.Int(required=True)
    epochs = fields.Int(required=True)
    batch_size = fields.Int()
    learning_rate = fields.Float()
    model_config_id = fields.Int(required=True)
    status = fields.Str(dump_only=True)
    accuracy = fields.Float()
    loss = fields.Float()
    r2_score = fields.Float()
    mae = fields.Float()
    rmse = fields.Float()
    mape = fields.Float()
    model_file_path = fields.Str()
    training_logs = fields.Str()
    started_at = fields.DateTime(dump_only=True)
    completed_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
