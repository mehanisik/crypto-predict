import numpy as np
import pandas as pd
import yfinance as yf


class MachineLearningModel:
    def fetch_data(self):
        url = yf.Ticker("BTC").history(period="max")
        df = pd.DataFrame(url)
        return df
        