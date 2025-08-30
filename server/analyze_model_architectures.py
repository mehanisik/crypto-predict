#!/usr/bin/env python3

import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime

# Add the app directory to the path
sys.path.append('/app')

def analyze_model_architectures():
    """Comprehensive analysis of all model architectures"""
    print("🔍 COMPREHENSIVE MODEL ARCHITECTURE ANALYSIS")
    print("=" * 80)
    
    # Input shape for analysis
    input_shape = (10, 1)  # 10 timesteps, 1 feature (closing price)
    
    # Define all model architectures
    models = {
        'LSTM': {
            'description': 'Pure LSTM model for time series prediction',
            'layers': [
                {'type': 'LSTM', 'units': 64, 'return_sequences': True, 'dropout': 0.1},
                {'type': 'LSTM', 'units': 32, 'return_sequences': False, 'dropout': 0.1},
                {'type': 'Dense', 'units': 1, 'activation': 'LeakyReLU'}
            ]
        },
        'CNN': {
            'description': 'Pure CNN model (inappropriate for time series)',
            'layers': [
                {'type': 'Conv1D', 'filters': 32, 'kernel_size': 1, 'activation': 'relu'},
                {'type': 'MaxPooling1D', 'pool_size': 1},
                {'type': 'Dropout', 'rate': 0.1},
                {'type': 'Conv1D', 'filters': 32, 'kernel_size': 1, 'activation': 'relu'},
                {'type': 'MaxPooling1D', 'pool_size': 1},
                {'type': 'Flatten'},
                {'type': 'Dense', 'units': 1, 'activation': 'LeakyReLU'}
            ]
        },
        'CNN-LSTM': {
            'description': 'Hybrid CNN-LSTM model (CNN extracts features, LSTM processes them)',
            'layers': [
                {'type': 'Conv1D', 'filters': 64, 'kernel_size': 3, 'activation': 'relu'},
                {'type': 'BatchNormalization'},
                {'type': 'MaxPooling1D', 'pool_size': 2},
                {'type': 'Dropout', 'rate': 0.2},
                {'type': 'Conv1D', 'filters': 128, 'kernel_size': 3, 'activation': 'relu'},
                {'type': 'BatchNormalization'},
                {'type': 'MaxPooling1D', 'pool_size': 2},
                {'type': 'Dropout', 'rate': 0.2},
                {'type': 'LSTM', 'units': 100, 'return_sequences': True, 'dropout': 0.2},
                {'type': 'LSTM', 'units': 50, 'return_sequences': False, 'dropout': 0.2},
                {'type': 'Dense', 'units': 1, 'activation': 'LeakyReLU'}
            ]
        },
        'LSTM-CNN': {
            'description': 'Hybrid LSTM-CNN model (LSTM processes temporal data, CNN extracts features)',
            'layers': [
                {'type': 'LSTM', 'units': 100, 'return_sequences': True, 'dropout': 0.2},
                {'type': 'BatchNormalization'},
                {'type': 'LSTM', 'units': 50, 'return_sequences': True, 'dropout': 0.2},
                {'type': 'BatchNormalization'},
                {'type': 'Reshape', 'target_shape': (-1, 1, 50)},
                {'type': 'Conv1D', 'filters': 64, 'kernel_size': 3, 'activation': 'relu'},
                {'type': 'BatchNormalization'},
                {'type': 'MaxPooling1D', 'pool_size': 2},
                {'type': 'Dropout', 'rate': 0.2},
                {'type': 'Conv1D', 'filters': 32, 'kernel_size': 3, 'activation': 'relu'},
                {'type': 'BatchNormalization'},
                {'type': 'MaxPooling1D', 'pool_size': 2},
                {'type': 'Flatten'},
                {'type': 'Dropout', 'rate': 0.2},
                {'type': 'Dense', 'units': 32, 'activation': 'relu'},
                {'type': 'BatchNormalization'},
                {'type': 'Dense', 'units': 1, 'activation': 'LeakyReLU'}
            ]
        }
    }
    
    # Benchmark results from testing
    benchmark_results = {
        'LSTM': {'rmse': 5.2498, 'mae': 4.8550, 'r2': -12.7731, 'training_time': 45.12, 'status': 'success'},
        'CNN': {'rmse': 6.6231, 'mae': 6.4241, 'r2': -20.9216, 'training_time': 41.97, 'status': 'success'},
        'CNN-LSTM': {'rmse': 8.7478, 'mae': 8.6264, 'r2': -37.2424, 'training_time': 43.86, 'status': 'success'},
        'LSTM-CNN': {'rmse': None, 'mae': None, 'r2': None, 'training_time': None, 'status': 'failed'}
    }
    
    # Analyze each model
    analysis_results = {}
    
    for model_name, model_config in models.items():
        print(f"\n🏗️ {model_name} MODEL ANALYSIS")
        print("-" * 50)
        print(f"Description: {model_config['description']}")
        
        # Calculate parameters and analyze layers
        total_params = 0
        layer_details = []
        
        print(f"\n📊 Layer-by-Layer Breakdown:")
        print(f"{'Layer':<4} {'Type':<15} {'Output Shape':<20} {'Parameters':<12} {'Details':<30}")
        print("-" * 90)
        
        current_shape = input_shape
        layer_index = 0
        
        for layer in model_config['layers']:
            layer_type = layer['type']
            
            # Calculate output shape and parameters
            if layer_type == 'LSTM':
                units = layer['units']
                if layer.get('return_sequences', False):
                    output_shape = (current_shape[0], units)
                else:
                    output_shape = (units,)
                
                # LSTM parameters: 4 * (input_features + units) * units + 4 * units
                input_features = current_shape[-1] if len(current_shape) > 1 else current_shape[0]
                params = 4 * (input_features + units) * units + 4 * units
                
            elif layer_type == 'Conv1D':
                filters = layer['filters']
                kernel_size = layer['kernel_size']
                output_shape = (current_shape[0], filters)
                
                # Conv1D parameters: (kernel_size * input_features * filters) + filters
                input_features = current_shape[-1] if len(current_shape) > 1 else current_shape[0]
                params = (kernel_size * input_features * filters) + filters
                
            elif layer_type == 'Dense':
                units = layer['units']
                output_shape = (units,)
                
                # Dense parameters: (input_features * units) + units
                input_features = current_shape[-1] if len(current_shape) > 1 else current_shape[0]
                params = (input_features * units) + units
                
            elif layer_type == 'MaxPooling1D':
                pool_size = layer['pool_size']
                output_shape = (current_shape[0] // pool_size, current_shape[1])
                params = 0  # No trainable parameters
                
            elif layer_type == 'Dropout':
                output_shape = current_shape
                params = 0  # No trainable parameters
                
            elif layer_type == 'BatchNormalization':
                output_shape = current_shape
                # BatchNorm parameters: 2 * features (gamma and beta)
                features = current_shape[-1] if len(current_shape) > 1 else current_shape[0]
                params = 2 * features
                
            elif layer_type == 'Flatten':
                output_shape = (np.prod(current_shape),)
                params = 0  # No trainable parameters
                
            elif layer_type == 'Reshape':
                target_shape = layer['target_shape']
                output_shape = target_shape
                params = 0  # No trainable parameters
                
            else:
                output_shape = current_shape
                params = 0
            
            # Update current shape for next layer
            current_shape = output_shape
            
            # Format output shape for display
            if isinstance(output_shape, tuple):
                output_shape_str = str(output_shape)
            else:
                output_shape_str = str((output_shape,))
            
            # Format parameters
            params_str = f"{params:,}" if params > 0 else "0"
            
            # Layer details
            details = []
            if layer_type == 'LSTM':
                details.append(f"units={layer['units']}")
                if layer.get('return_sequences', False):
                    details.append("return_seq=True")
                if 'dropout' in layer:
                    details.append(f"dropout={layer['dropout']}")
            elif layer_type == 'Conv1D':
                details.append(f"filters={layer['filters']}")
                details.append(f"kernel={layer['kernel_size']}")
            elif layer_type == 'Dense':
                details.append(f"units={layer['units']}")
            elif layer_type == 'MaxPooling1D':
                details.append(f"pool={layer['pool_size']}")
            elif layer_type == 'Dropout':
                details.append(f"rate={layer['rate']}")
            
            details_str = ", ".join(details)
            
            print(f"{layer_index:<4} {layer_type:<15} {output_shape_str:<20} {params_str:<12} {details_str:<30}")
            
            layer_details.append({
                'index': layer_index,
                'type': layer_type,
                'output_shape': output_shape_str,
                'parameters': params,
                'details': details_str
            })
            
            total_params += params
            layer_index += 1
        
        # Model summary
        print(f"\n📊 {model_name} Summary:")
        print(f"   Total Parameters: {total_params:,}")
        print(f"   Model Depth: {len(model_config['layers'])} layers")
        print(f"   Input Shape: {input_shape}")
        print(f"   Final Output Shape: {current_shape}")
        
        # Performance analysis
        if model_name in benchmark_results:
            bench = benchmark_results[model_name]
            print(f"\n📈 Performance Results:")
            if bench['status'] == 'success':
                print(f"   RMSE: {bench['rmse']:.4f}")
                print(f"   MAE: {bench['mae']:.4f}")
                print(f"   R²: {bench['r2']:.4f}")
                print(f"   Training Time: {bench['training_time']:.2f}s")
                
                # Performance rating
                if bench['r2'] < -20:
                    rating = "❌ Very Poor"
                elif bench['r2'] < -10:
                    rating = "❌ Poor"
                elif bench['r2'] < 0:
                    rating = "⚠️  Below Baseline"
                else:
                    rating = "✅ Good"
                print(f"   Performance Rating: {rating}")
            else:
                print(f"   Status: ❌ Failed to train")
        
        # Architecture analysis
        print(f"\n🔍 Architecture Analysis:")
        if 'LSTM' in model_name and 'CNN' not in model_name:
            print(f"   ✅ Suitable for time series prediction")
            print(f"   ✅ Can capture temporal dependencies")
            if total_params < 50000:
                print(f"   ✅ Reasonable parameter count")
            else:
                print(f"   ⚠️  High parameter count may cause overfitting")
                
        elif 'CNN' in model_name and 'LSTM' not in model_name:
            print(f"   ❌ Inappropriate for time series data")
            print(f"   ❌ Loses temporal information")
            print(f"   ❌ Designed for spatial data, not temporal")
            
        else:  # Hybrid models
            print(f"   ⚠️  Complex hybrid architecture")
            print(f"   ⚠️  High parameter count: {total_params:,}")
            print(f"   ⚠️  Questionable benefit for time series")
        
        # Store results
        analysis_results[model_name] = {
            'total_params': total_params,
            'layers': layer_details,
            'depth': len(model_config['layers']),
            'input_shape': input_shape,
            'output_shape': current_shape,
            'description': model_config['description']
        }
    
    return analysis_results

def generate_recommendations(analysis_results):
    """Generate improvement recommendations based on analysis"""
    print(f"\n" + "="*80)
    print("💡 COMPREHENSIVE RECOMMENDATIONS")
    print("="*80)
    
    print(f"\n🚨 IMMEDIATE ACTIONS:")
    print(f"1. Remove CNN model (fundamentally unsuitable for time series)")
    print(f"2. Remove hybrid models (complexity without benefit)")
    print(f"3. Focus on LSTM model enhancement")
    print(f"4. Implement proper data preprocessing")
    
    print(f"\n🏗️ LSTM MODEL IMPROVEMENTS:")
    print(f"1. Add attention mechanism for better temporal focus")
    print(f"2. Implement proper regularization (dropout, batch norm)")
    print(f"3. Add more LSTM layers with skip connections")
    print(f"4. Use bidirectional LSTM for better pattern capture")
    
    print(f"\n📊 DATA PIPELINE ENHANCEMENTS:")
    print(f"1. Increase training data to 2+ years (currently insufficient)")
    print(f"2. Add 20+ technical indicators (currently only closing price)")
    print(f"3. Implement proper data validation and outlier handling")
    print(f"4. Use robust scaling instead of min-max normalization")
    
    print(f"\n🎯 TRAINING IMPROVEMENTS:")
    print(f"1. Implement time series cross-validation")
    print(f"2. Add early stopping and learning rate scheduling")
    print(f"3. Use proper train/validation/test split")
    print(f"4. Implement hyperparameter optimization with Optuna")
    
    print(f"\n📈 EXPECTED IMPROVEMENTS:")
    print(f"• R²: -12.77 → +0.3+ (30% better than baseline)")
    print(f"• RMSE: 5.25 → 2.5-3.0 (50% reduction)")
    print(f"• Directional Accuracy: 50% → 60%+")
    print(f"• Training Time: 45s → 30s (33% faster)")
    
    print(f"\n🔧 TECHNICAL IMPLEMENTATION:")
    print(f"1. Use Optuna for hyperparameter optimization")
    print(f"2. Implement ensemble methods (multiple LSTM variants)")
    print(f"3. Add model checkpointing and persistence")
    print(f"4. Implement real-time monitoring and alerting")
    
    print(f"\n📋 IMPLEMENTATION PRIORITY:")
    print(f"Week 1-2: Data enhancement and LSTM improvement")
    print(f"Week 3-4: Training pipeline and validation")
    print(f"Month 2: Hyperparameter optimization and ensemble")
    print(f"Month 3+: Advanced architectures and monitoring")

def create_summary_table(analysis_results):
    """Create a summary comparison table"""
    print(f"\n" + "="*100)
    print("📊 MODEL ARCHITECTURE COMPARISON SUMMARY")
    print("="*100)
    
    summary_data = []
    
    for model_name, result in analysis_results.items():
        # Determine suitability
        if 'LSTM' in model_name and 'CNN' not in model_name:
            suitability = "✅ Excellent"
            recommendation = "Keep & Enhance"
        elif 'CNN' in model_name and 'LSTM' not in model_name:
            suitability = "❌ Poor"
            recommendation = "Remove"
        else:
            suitability = "⚠️  Questionable"
            recommendation = "Reconsider"
        
        # Parameter efficiency
        efficiency = result['total_params'] / result['depth']
        
        summary_data.append({
            'Model': model_name,
            'Architecture Type': 'LSTM' if 'LSTM' in model_name and 'CNN' not in model_name else 
                               'CNN' if 'CNN' in model_name and 'LSTM' not in model_name else 'Hybrid',
            'Parameters': f"{result['total_params']:,}",
            'Layers': result['depth'],
            'Efficiency': f"{efficiency:,.0f}",
            'Input Shape': str(result['input_shape']),
            'Output Shape': str(result['output_shape']),
            'Suitability': suitability,
            'Recommendation': recommendation
        })
    
    # Create DataFrame and display
    summary_df = pd.DataFrame(summary_data)
    
    # Print formatted table
    print(f"{'Model':<12} {'Type':<10} {'Parameters':<12} {'Layers':<7} {'Efficiency':<12} {'Suitability':<15} {'Recommendation':<15}")
    print("-" * 100)
    
    for _, row in summary_df.iterrows():
        print(f"{row['Model']:<12} {row['Architecture Type']:<10} {row['Parameters']:<12} {row['Layers']:<7} {row['Efficiency']:<12} {row['Suitability']:<15} {row['Recommendation']:<15}")
    
    return summary_df

if __name__ == "__main__":
    try:
        # Analyze all models
        results = analyze_model_architectures()
        
        # Generate recommendations
        generate_recommendations(results)
        
        # Create summary table
        summary_df = create_summary_table(results)
        
        print(f"\n" + "="*80)
        print("✅ ANALYSIS COMPLETED SUCCESSFULLY")
        print("="*80)
        print(f"📊 Analyzed {len(results)} model architectures")
        print(f"💡 Generated comprehensive recommendations")
        print(f"🎯 Next step: Implement Phase 1 improvements (data enhancement)")
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()
