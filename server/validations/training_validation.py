from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime


class TrainingRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    model: str = Field(..., min_length=1, max_length=10)
    start_date: str
    end_date: str
    lookback: Optional[int] = Field(default=8, ge=1, le=60)
    epochs: Optional[int] = Field(default=100, ge=1, le=1000)

    @field_validator('start_date', 'end_date')
    @classmethod
    def parse_dates(cls, v: str) -> str:
        try:
            # Validate that the date string can be parsed
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

    @field_validator('end_date')
    @classmethod
    def end_date_must_be_after_start_date(cls, v: str, info) -> str:
        start_date_str = info.data.get('start_date')
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(v, '%Y-%m-%d').date()
                if end_date <= start_date:
                    raise ValueError('end_date must be after start_date')
                if end_date > date.today():
                    raise ValueError('end_date cannot be in the future')
            except ValueError:
                pass  # Let the parse_dates validator handle format errors
        return v

    @field_validator('ticker')
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        if not all(char.isalnum() or char == '-' for char in v):
            raise ValueError('ticker must contain only letters, numbers, and hyphens')
        return v.upper()
    
