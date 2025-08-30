#!/usr/bin/env python3

import os
import sys
import time
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add the app directory to the path
sys.path.append('/app')

def benchmark_models():
    """Benchmark all available models for performance comparison"""
    print("=" * 60)
    print("MODEL PERFORMANCE BENCHMARKING")
    print("=" * 60)
    
    # Test configuration
    test_config = {
        "ticker": "AAPL",
        "start_date": "2020-01-01",
        "end_date": "2024-06-01",  # 4.5 years of data  (Updated)
        "lookback": 10,
        "epochs": 10,
        "batch_size": 32
    }
    
    models_to_test = [
        "LSTM",
        "CNN", 
        "CNN-LSTM",
        "LSTM-CNN"
    ]
    
    results = {}
    
    for model_name in models_to_test:
        print(f"\n🧪 Testing {model_name} Model...")
        print("-" * 40)
        
        try:
            # Test training performance
            train_start = time.time()
            
            # Make training request
            import requests
            training_data = {
                "ticker": test_config["ticker"],
                "model": model_name,
                "start_date": test_config["start_date"],
                "end_date": test_config["end_date"],
                "lookback": test_config["lookback"],
                "epochs": test_config["epochs"]
            }
            
            response = requests.post(
                "http://localhost:5000/train",
                json=training_data,
                timeout=300  # 5 minutes timeout
            )
            
            train_end = time.time()
            training_time = train_end - train_start
            
            if response.status_code == 200:
                train_result = response.json()
                
                # Extract metrics
                train_metrics = train_result.get("data", {}).get("train_metrics", {})
                test_metrics = train_result.get("data", {}).get("test_metrics", {})
                
                # Test prediction performance
                pred_start = time.time()
                
                pred_response = requests.post(
                    "http://localhost:5000/predict",
                    json={"start_date": "2024-06-01", "days": 5},
                    timeout=60
                )
                
                pred_end = time.time()
                prediction_time = pred_end - pred_start
                
                if pred_response.status_code == 200:
                    pred_result = pred_response.json()
                    
                    # Store results
                    results[model_name] = {
                        "training_time": training_time,
                        "prediction_time": prediction_time,
                        "train_metrics": train_metrics,
                        "test_metrics": test_metrics,
                        "prediction_accuracy": analyze_predictions(pred_result),
                        "status": "success"
                    }
                    
                    print(f"✅ {model_name} - Training: {training_time:.2f}s, Prediction: {prediction_time:.2f}s")
                    print(f"   Test RMSE: {test_metrics.get('rmse', 'N/A'):.4f}")
                    print(f"   Test MAE: {test_metrics.get('mae', 'N/A'):.4f}")
                    print(f"   Test R²: {test_metrics.get('r2', 'N/A'):.4f}")
                    
                else:
                    print(f"❌ {model_name} - Prediction failed: {pred_response.status_code}")
                    results[model_name] = {
                        "status": "prediction_failed",
                        "error": f"HTTP {pred_response.status_code}"
                    }
            else:
                print(f"❌ {model_name} - Training failed: {response.status_code}")
                results[model_name] = {
                    "status": "training_failed", 
                    "error": f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            print(f"❌ {model_name} - Error: {str(e)}")
            results[model_name] = {
                "status": "error",
                "error": str(e)
            }
    
    # Generate performance report
    print("\n" + "=" * 60)
    print("PERFORMANCE BENCHMARK RESULTS")
    print("=" * 60)
    
    generate_performance_report(results, test_config)
    
    return results

def analyze_predictions(pred_result):
    """Analyze prediction quality and consistency"""
    try:
        predictions = pred_result.get("data", {}).get("predictions", [])
        if not predictions:
            return {"status": "no_predictions"}
        
        prices = [p.get("predicted_price", 0) for p in predictions]
        confidence_intervals = [p.get("confidence_interval", 0) for p in predictions]
        
        # Calculate prediction statistics
        price_changes = np.diff(prices)
        volatility = np.std(price_changes) if len(price_changes) > 0 else 0
        avg_confidence = np.mean(confidence_intervals) if confidence_intervals else 0
        
        return {
            "price_volatility": float(volatility),
            "avg_confidence_interval": float(avg_confidence),
            "prediction_trend": "increasing" if price_changes[-1] > 0 else "decreasing" if price_changes[-1] < 0 else "stable",
            "price_range": float(max(prices) - min(prices))
        }
    except Exception as e:
        return {"status": "analysis_error", "error": str(e)}

def generate_performance_report(results, config):
    """Generate comprehensive performance report"""
    
    # Filter successful models
    successful_models = {k: v for k, v in results.items() if v.get("status") == "success"}
    
    if not successful_models:
        print("❌ No models completed successfully")
        return
    
    print(f"\n📊 Test Configuration:")
    print(f"   Ticker: {config['ticker']}")
    print(f"   Data Period: {config['start_date']} to {config['end_date']}")
    print(f"   Lookback: {config['lookback']} days")
    print(f"   Epochs: {config['epochs']}")
    
    print(f"\n🏆 Performance Rankings:")
    
    # Sort by test RMSE (lower is better)
    sorted_by_rmse = sorted(
        successful_models.items(),
        key=lambda x: x[1].get("test_metrics", {}).get("rmse", float('inf'))
    )
    
    print(f"\n📈 Accuracy Ranking (by Test RMSE):")
    for i, (model_name, result) in enumerate(sorted_by_rmse, 1):
        rmse = result.get("test_metrics", {}).get("rmse", "N/A")
        mae = result.get("test_metrics", {}).get("mae", "N/A")
        r2 = result.get("test_metrics", {}).get("r2", "N/A")
        print(f"   {i}. {model_name}: RMSE={rmse:.4f}, MAE={mae:.4f}, R²={r2:.4f}")
    
    # Sort by training time (faster is better)
    sorted_by_speed = sorted(
        successful_models.items(),
        key=lambda x: x[1].get("training_time", float('inf'))
    )
    
    print(f"\n⚡ Speed Ranking (by Training Time):")
    for i, (model_name, result) in enumerate(sorted_by_speed, 1):
        train_time = result.get("training_time", "N/A")
        pred_time = result.get("prediction_time", "N/A")
        print(f"   {i}. {model_name}: Training={train_time:.2f}s, Prediction={pred_time:.2f}s")
    
    # Overall performance score
    print(f"\n🎯 Overall Performance Analysis:")
    
    best_accuracy = sorted_by_rmse[0] if sorted_by_rmse else None
    fastest_training = sorted_by_speed[0] if sorted_by_speed else None
    
    if best_accuracy:
        print(f"   🏆 Best Accuracy: {best_accuracy[0]} (RMSE: {best_accuracy[1]['test_metrics']['rmse']:.4f})")
    
    if fastest_training:
        print(f"   🚀 Fastest Training: {fastest_training[0]} ({fastest_training[1]['training_time']:.2f}s)")
    
    # Model comparison table
    print(f"\n📋 Detailed Comparison Table:")
    print(f"{'Model':<12} {'RMSE':<8} {'MAE':<8} {'R²':<8} {'Train(s)':<10} {'Pred(s)':<8}")
    print("-" * 65)
    
    for model_name, result in successful_models.items():
        metrics = result.get("test_metrics", {})
        rmse = metrics.get("rmse", "N/A")
        mae = metrics.get("mae", "N/A")
        r2 = metrics.get("r2", "N/A")
        train_time = result.get("training_time", "N/A")
        pred_time = result.get("prediction_time", "N/A")
        
        print(f"{model_name:<12} {rmse:<8.4f} {mae:<8.4f} {r2:<8.4f} {train_time:<10.2f} {pred_time:<8.2f}")
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"model_benchmark_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump({
            "timestamp": timestamp,
            "test_config": config,
            "results": results,
            "summary": {
                "total_models": len(results),
                "successful_models": len(successful_models),
                "best_accuracy_model": best_accuracy[0] if best_accuracy else None,
                "fastest_model": fastest_training[0] if fastest_training else None
            }
        }, f, indent=2)
    
    print(f"\n💾 Results saved to: {filename}")

if __name__ == "__main__":
    try:
        results = benchmark_models()
        print(f"\n✅ Benchmarking completed successfully!")
        print(f"📊 Tested {len(results)} models")
        
    except Exception as e:
        print(f"\n❌ Benchmarking failed: {str(e)}")
        import traceback
        traceback.print_exc()
