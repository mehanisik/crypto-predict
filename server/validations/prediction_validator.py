from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date

class PredictionRequest(BaseModel):
    start_date: date
    days: Optional[int] = Field(default=15, ge=1, le=30)

    @field_validator('start_date')
    def start_date_must_be_before_today(cls, v, info):
        if v > date.today():
            raise ValueError('start_date cannot be in the future')
        return v
    
    @field_validator('days')
    def days_must_be_less_than_30(cls, v, info):
        if v > 30:
            raise ValueError('days must be less than 30')
        if v < 1:
            raise ValueError('days must be greater than 0')
        return v
