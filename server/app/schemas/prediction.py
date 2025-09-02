from datetime import date
from marshmallow import Schema, fields, validates, ValidationError, INCLUDE


class PredictionRequestSchema(Schema):
    class Meta:
        unknown = INCLUDE  # Ignore unexpected fields like end_date
    ticker = fields.Str(required=True, validate=lambda x: len(x) <= 20)
    start_date = fields.Date(required=True)
    days = fields.Int(required=True, validate=lambda x: 1 <= x <= 30)
    
    @validates('start_date')
    def validate_start_date(self, value: date, **kwargs) -> None:
        from datetime import date as datetime_date
        if value > datetime_date.today():
            raise ValidationError('Start date cannot be in the future')
    
    @validates('ticker')
    def validate_ticker(self, value: str, **kwargs) -> None:
        if not value or len(value) < 1:
            raise ValidationError('Ticker cannot be empty')
        # Allow common ticker formats: BTC-USD, ETH-USD, etc.
        if not all(c.isalnum() or c in '-_' for c in value):
            raise ValidationError('Ticker can only contain letters, numbers, hyphens, and underscores')
    
    @validates('days')
    def validate_days(self, value: int, **kwargs) -> None:
        if value < 1 or value > 30:
            raise ValidationError('Days must be between 1 and 30')


class PredictionResponseSchema(Schema):
    request_id = fields.Str(required=True)
    status = fields.Str(required=True)
    data = fields.Dict(required=True)
    timestamp = fields.DateTime(dump_only=True)
    
    class Meta:
        unknown = INCLUDE
