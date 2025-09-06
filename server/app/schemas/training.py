from datetime import date
from marshmallow import Schema, fields, validates, ValidationError, INCLUDE


class TrainingRequestSchema(Schema):
    ticker = fields.Str(required=True, validate=lambda x: len(x) <= 20)
    model_type = fields.Str(required=True, validate=lambda x: x in ['CNN', 'LSTM', 'CNN-LSTM', 'LSTM-CNN'])
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    lookback = fields.Int(required=True, validate=lambda x: 10 <= x <= 365)
    epochs = fields.Int(required=True, validate=lambda x: 1 <= x <= 1000)
    batch_size = fields.Int(validate=lambda x: x is None or (8 <= x <= 256))
    learning_rate = fields.Float(validate=lambda x: x is None or (0.0001 <= x <= 0.1))

    @validates('start_date')
    def validate_start_date(self, value: date, **kwargs) -> None:
        from datetime import date as datetime_date
        if value > datetime_date.today():
            raise ValidationError('Start date cannot be in the future')

    @validates('end_date')
    def validate_end_date(self, value: date, **kwargs) -> None:
        if hasattr(self, 'start_date') and value <= self.start_date:
            raise ValidationError('End date must be after start date')

    @validates('ticker')
    def validate_ticker(self, value: str, **kwargs) -> None:
        if not value or len(value) < 1:
            raise ValidationError('Ticker cannot be empty')
        # Allow common ticker formats: BTC-USD, ETH-USD, etc.
        if not all(c.isalnum() or c in '-_' for c in value):
            raise ValidationError('Ticker can only contain letters, numbers, hyphens, and underscores')

    @validates('lookback')
    def validate_lookback(self, value: int, **kwargs) -> None:
        if value < 10 or value > 365:
            raise ValidationError('Lookback must be between 10 and 365 days')

    @validates('epochs')
    def validate_epochs(self, value: int, **kwargs) -> None:
        if value < 1 or value > 1000:
            raise ValidationError('Epochs must be between 1 and 1000')


class TrainingResponseSchema(Schema):
    request_id = fields.Str(required=True)
    status = fields.Str(required=True)
    session_id = fields.Str(required=True)
    message = fields.Str(required=True)
    timestamp = fields.DateTime(dump_only=True)

    class Meta:
        unknown = INCLUDE
