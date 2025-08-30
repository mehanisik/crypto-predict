#!/usr/bin/env python3

import yfinance as yf
import pandas as pd
from datetime import datetime

def test_yfinance():
    print("Testing yfinance directly...")
    
    # Test 1: Simple ticker creation
    try:
        ticker = yf.Ticker('AAPL')
        print("✓ Ticker created successfully")
    except Exception as e:
        print(f"✗ Failed to create ticker: {e}")
        return
    
    # Test 2: Get history with specific dates
    try:
        hist = ticker.history(start='2023-01-01', end='2023-12-31')
        print(f"✓ History retrieved successfully: {hist.shape}")
        print(f"  - Date range: {hist.index[0]} to {hist.index[-1]}")
        print(f"  - Columns: {list(hist.columns)}")
    except Exception as e:
        print(f"✗ Failed to get history: {e}")
        return
    
    # Test 3: Test crypto ticker
    try:
        crypto_ticker = yf.Ticker('BTC-USD')
        crypto_hist = crypto_ticker.history(start='2023-01-01', end='2023-12-31')
        print(f"✓ Crypto history retrieved successfully: {crypto_hist.shape}")
    except Exception as e:
        print(f"✗ Failed to get crypto history: {e}")
        return
    
    print("\nAll tests passed! yfinance is working correctly.")

if __name__ == "__main__":
    test_yfinance()
