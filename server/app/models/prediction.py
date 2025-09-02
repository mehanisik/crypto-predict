from datetime import datetime, timezone
from app import db
from marshmallow import Schema, fields


class Prediction(db.Model):
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.String(50), nullable=False, index=True)
    ticker = db.Column(db.String(20), nullable=False, index=True)
    model_type = db.Column(db.String(50), nullable=False)
    prediction_date = db.Column(db.Date, nullable=False, index=True)
    predicted_price = db.Column(db.Float, nullable=False)
    confidence_score = db.Column(db.Float)
    actual_price = db.Column(db.Float)
    is_accurate = db.Column(db.Boolean)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    training_session_id = db.Column(db.Integer, db.ForeignKey('training_sessions.id'))
    training_session = db.relationship('TrainingSession', backref='predictions')
    
    def __repr__(self) -> str:
        return f'<Prediction {self.request_id} {self.ticker} {self.predicted_price}>'
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'request_id': self.request_id,
            'ticker': self.ticker,
            'model_type': self.model_type,
            'prediction_date': self.prediction_date.isoformat() if self.prediction_date else None,
            'predicted_price': self.predicted_price,
            'confidence_score': self.confidence_score,
            'actual_price': self.actual_price,
            'is_accurate': self.is_accurate,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'training_session_id': self.training_session_id
        }


class PredictionSchema(Schema):
    id = fields.Int(dump_only=True)
    request_id = fields.Str(required=True)
    ticker = fields.Str(required=True)
    model_type = fields.Str(required=True)
    prediction_date = fields.Date(required=True)
    predicted_price = fields.Float(required=True)
    confidence_score = fields.Float()
    actual_price = fields.Float()
    is_accurate = fields.Bool()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    training_session_id = fields.Int()
