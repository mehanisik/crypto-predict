import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev")
    COINGECKO_API_URL = "https://api.coingecko.com/api/v3"

