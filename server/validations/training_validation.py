from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date


class TrainingRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    model: str = Field(..., min_length=1, max_length=10)
    start_date: date
    end_date: date
    lookback: Optional[int] = Field(default=8, ge=1, le=60)
    epochs: Optional[int] = Field(default=100, ge=1, le=1000)

    @field_validator('end_date')
    def end_date_must_be_after_start_date(cls, v, info):
        start_date = info.data.get('start_date')
        if start_date and v <= start_date:
            raise ValueError('end_date must be after start_date')
        if v > date.today():
            raise ValueError('end_date cannot be in the future')
        return v

    @field_validator('ticker')
    def validate_ticker(cls, v):
        if not all(char.isalnum() or char == '-' for char in v):
            raise ValueError('ticker must contain only letters, numbers, and hyphens')
        return v.upper()
    
