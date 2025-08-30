#!/usr/bin/env python3

import os
import sys
from datetime import datetime, timedelta

# Add the app directory to the path
sys.path.append('/app')

def test_polygon_integration():
    """Test Polygon.io integration"""
    print("Testing Polygon.io integration...")
    
    # Check if API key is set
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        print("❌ POLYGON_API_KEY environment variable not set")
        print("Please set POLYGON_API_KEY with your Polygon.io API key")
        return False
    
    print(f"✅ API key found: {api_key[:8]}...")
    
    try:
        # Test Polygon client initialization
        from polygon import RESTClient
        client = RESTClient(api_key)
        print("✅ Polygon client initialized successfully")
        
        # Test basic API call
        end_date = datetime.now()
        start_date = end_date - timedelta(days=5)
        
        print(f"Testing data fetch for AAPL from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        aggs = client.get_aggs(
            ticker="AAPL",
            multiplier=1,
            timespan='day',
            from_=start_date.strftime('%Y-%m-%d'),
            to=end_date.strftime('%Y-%m-%d'),
            adjusted=True,
            sort='asc',
            limit=10
        )
        
        if aggs:
            print(f"✅ Data fetched successfully: {len(aggs)} records")
            
            # Show sample data
            sample = aggs[0]
            print(f"Sample data point:")
            print(f"  Date: {datetime.fromtimestamp(sample.timestamp/1000)}")
            print(f"  Open: ${sample.open:.2f}")
            print(f"  High: ${sample.high:.2f}")
            print(f"  Low: ${sample.low:.2f}")
            print(f"  Close: ${sample.close:.2f}")
            print(f"  Volume: {sample.volume:,}")
            
            return True
        else:
            print("❌ No data returned from API")
            return False
            
    except ImportError as e:
        print(f"❌ Failed to import polygon library: {e}")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def test_data_processor():
    """Test the updated DataProcessor with Polygon"""
    print("\nTesting DataProcessor with Polygon...")
    
    try:
        from ml_app.data.processor import DataProcessor
        from ml_app.config import ModelConfig
        
        # Create config
        config = ModelConfig(
            model="LSTM",
            lookback=10,
            epochs=5,
            ticker="AAPL"
        )
        
        # Initialize processor
        processor = DataProcessor(config)
        print("✅ DataProcessor initialized successfully")
        
        # Test data fetching
        start_date = "2024-01-01"
        end_date = "2024-01-31"
        
        print(f"Testing data fetch for {config.ticker} from {start_date} to {end_date}")
        
        # This will test the actual data fetching
        try:
            (X_train, y_train), (X_test, y_test), close_prices = processor.fetch_and_prepare_data(
                config.ticker, start_date, end_date
            )
            
            print(f"✅ Data preparation successful!")
            print(f"  Total data points: {len(close_prices)}")
            print(f"  Training samples: {len(X_train)}")
            print(f"  Test samples: {len(X_test)}")
            print(f"  Lookback window: {config.lookback}")
            
            return True
            
        except Exception as e:
            print(f"❌ Data preparation failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ DataProcessor test failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Polygon.io Integration Test")
    print("=" * 50)
    
    # Test basic integration
    basic_test = test_polygon_integration()
    
    if basic_test:
        # Test data processor
        processor_test = test_data_processor()
        
        if processor_test:
            print("\n🎉 All tests passed! Polygon.io integration is working.")
        else:
            print("\n❌ DataProcessor test failed.")
    else:
        print("\n❌ Basic integration test failed.")
    
    print("=" * 50)
