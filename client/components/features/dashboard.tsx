"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  Brain, 
  TrendingUp, 
  Server, 
  Wifi, 
  WifiOff,
  Play,
  RefreshCw,
  AlertCircle,
  Clock,
  BarChart3,
  Zap,
  Target,
  Loader2,
  Database,
  Cpu,
  Network,
  Calendar,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus,
  Grid3X3
} from "lucide-react";
import { ApiService } from '@/lib/api';
import { useWebSocket, TrainingUpdate } from '@/lib/websocket';

// Import widgets
import MarketOverviewWidget from '@/components/widgets/market-overview';
import MachineLearningWidget from '@/components/widgets/ml-model';
import LiveChartWidget from '@/components/widgets/technical-analysis';

// Import the interface from the API service
import type { RunningTrainingData } from '@/lib/api';

interface ServerStatus {
  health: {
    status: string;
    services: {
      database: string;
      training_service: string;
    };
  } | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
}

interface TrainingStatus {
  isTraining: boolean;
  progress: number;
  currentStage: string;
  sessionId: string | null;
  accuracy: number | null;
  loss: number | null;
  currentEpoch: number | null;
  totalEpochs: number | null;
  startTime: Date | null;
  estimatedCompletion: Date | null;
}

interface PredictionResult {
  ticker: string;
  predictions: Array<{
    date: string;
    price: number;
    confidence: number;
  }>;
  modelInfo: {
    model_type: string;
    accuracy: number;
    last_trained: string;
  };
  generatedAt: Date;
}

interface MarketStats {
  totalPredictions: number;
  activeModels: number;
  averageAccuracy: number;
  lastUpdate: Date;
}

export default function Dashboard() {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    health: null,
    isConnected: false,
    isLoading: false,
    error: null,
    lastChecked: null
  });

  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    isTraining: false,
    progress: 0,
    currentStage: 'idle',
    sessionId: null,
    accuracy: null,
    loss: null,
    currentEpoch: null,
    totalEpochs: null,
    startTime: null,
    estimatedCompletion: null
  });

  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalPredictions: 0,
    activeModels: 0,
    averageAccuracy: 0,
    lastUpdate: new Date()
  });
  const [runningTrainings, setRunningTrainings] = useState<RunningTrainingData[]>([]);

  // Use the custom WebSocket hook
  const {
    isConnected: wsConnected,
    error: wsError,
    joinTrainingRoom,
    onTrainingUpdate,
    reconnect: wsReconnect
  } = useWebSocket();

  // Check server health on mount and periodically
  useEffect(() => {
    checkServerHealth();
    
    // Set up periodic health checks
    const healthInterval = setInterval(checkServerHealth, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(healthInterval);
    };
  }, []);

  // WebSocket connection monitoring and event handling
  useEffect(() => {
    const handleTrainingUpdate = (update: TrainingUpdate) => {
      console.log('📡 Training update received:', update);
      
      if (update.session_id === trainingStatus.sessionId) {
        setTrainingStatus(prev => ({
          ...prev,
          progress: update.progress || prev.progress,
          currentStage: update.type || prev.currentStage,
          isTraining: update.type !== 'training_completed',
          accuracy: update.accuracy || prev.accuracy,
          loss: update.loss || prev.loss,
          currentEpoch: update.current_epoch || prev.currentEpoch,
          totalEpochs: update.total_epochs || prev.totalEpochs
        }));
      }
    };

    // Set up WebSocket event listeners
    const unsubscribeTraining = onTrainingUpdate(handleTrainingUpdate);
    
    return () => {
      unsubscribeTraining();
    };
  }, [trainingStatus.sessionId, onTrainingUpdate]);

  // Update server status with WebSocket state
  useEffect(() => {
    setServerStatus(prev => ({ 
      ...prev, 
      isConnected: wsConnected,
      error: wsError || prev.error
    }));
  }, [wsConnected, wsError]);

  const checkServerHealth = useCallback(async () => {
    setServerStatus(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const health = await ApiService.getHealth();
      setServerStatus(prev => ({ 
        ...prev, 
        health, 
        isLoading: false, 
        lastChecked: new Date() 
      }));
    } catch (err) {
      setServerStatus(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to check server health',
        isLoading: false 
      }));
    }
  }, []);

  const loadRunningTrainings = useCallback(async () => {
    try {
      const response = await ApiService.getRunningTrainings();
      setRunningTrainings(response.running_trainings);
    } catch (err) {
      console.error('Failed to load running trainings:', err);
    }
  }, []);

  const startTraining = async () => {
    try {
      console.log('🚀 Starting training...');
      setTrainingStatus(prev => ({ 
        ...prev, 
        isTraining: true, 
        progress: 0, 
        startTime: new Date() 
      }));
      
      const response = await ApiService.startTraining({
        ticker: 'ETH-USD',
        model_type: 'LSTM',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        lookback: 30,
        epochs: 50,
        batch_size: 32,
        learning_rate: 0.001
      });

      console.log('✅ Training started:', response);

      setTrainingStatus(prev => ({ 
        ...prev, 
        sessionId: response.session_id,
        currentStage: 'training_started'
      }));

      // Join training room for real-time updates
      joinTrainingRoom(response.session_id);
      console.log('🎯 Joined training room:', response.session_id);
      
      // Load running trainings
      await loadRunningTrainings();
      
    } catch (err) {
      setTrainingStatus(prev => ({ ...prev, isTraining: false }));
      console.error('❌ Training failed:', err);
    }
  };

  const makePrediction = async () => {
    setIsLoadingPrediction(true);
    try {
      const response = await ApiService.getPrediction({
        ticker: 'ETH-USD',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        days: 7
      });
      
      setPredictionResult({
        ticker: response.data.ticker,
        predictions: response.data.predictions,
        modelInfo: {
          model_type: response.data.model_config.model_type,
          accuracy: 0.85, // Default accuracy since not provided in response
          last_trained: new Date().toISOString()
        },
        generatedAt: new Date()
      });

      // Update market stats
      setMarketStats(prev => ({
        ...prev,
        totalPredictions: prev.totalPredictions + 1,
        lastUpdate: new Date()
      }));
      
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  const getConnectionIcon = () => {
    if (serverStatus.isLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (serverStatus.isConnected) return <Wifi className="h-4 w-4 text-green-500" />;
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getConnectionText = () => {
    if (serverStatus.isLoading) return 'Checking...';
    if (serverStatus.isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'completed':
        return 'text-green-500';
      case 'training':
      case 'in_progress':
        return 'text-blue-500';
      case 'error':
      case 'failed':
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriceChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              CryptoPredict
            </h1>
            <p className="text-muted-foreground mt-1">AI-Powered Cryptocurrency Predictions Dashboard</p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-lg border">
              {getConnectionIcon()}
              <span className="text-sm font-medium">{getConnectionText()}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkServerHealth}
              disabled={serverStatus.isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${serverStatus.isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {wsError && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={wsReconnect}
                className="text-red-500 hover:text-red-600"
              >
                <RefreshCw className="h-4 w-4" />
                Reconnect
              </Button>
            )}
          </div>
        </div>

        {/* Server Status Alert */}
        {serverStatus.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverStatus.error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="widgets">Widgets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Server Status</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getStatusColor(serverStatus.health?.status || 'unknown')}`}>
                    {serverStatus.health?.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Database: {serverStatus.health?.services?.database || 'Unknown'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">WebSocket</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getStatusColor(serverStatus.isConnected ? 'connected' : 'disconnected')}`}>
                    {serverStatus.isConnected ? 'Connected' : 'Disconnected'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Real-time updates
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Training Status</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getStatusColor(trainingStatus.currentStage)}`}>
                    {trainingStatus.isTraining ? 'Training' : 'Idle'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {trainingStatus.currentStage}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Predictions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {predictionResult ? predictionResult.predictions.length : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available forecasts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Market Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Market Statistics
                </CardTitle>
                <CardDescription>
                  Real-time market insights and model performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Predictions</p>
                      <p className="text-2xl font-bold">{marketStats.totalPredictions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Cpu className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active Models</p>
                      <p className="text-2xl font-bold">{marketStats.activeModels}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Percent className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Avg Accuracy</p>
                      <p className="text-2xl font-bold">{marketStats.averageAccuracy.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Running Trainings */}
            {runningTrainings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5" />
                    Active Training Sessions
                  </CardTitle>
                  <CardDescription>
                    Currently running model training sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {runningTrainings.map((training, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Brain className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{training.ticker}</p>
                            <p className="text-sm text-muted-foreground">
                              {training.model_type} • Session: {training.session_id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{training.status}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Started: {formatDate(training.started_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Model Training
                </CardTitle>
                <CardDescription>
                  Train machine learning models for cryptocurrency prediction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {trainingStatus.isTraining ? (
                  <div className="space-y-6">
                    {/* Training Progress */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Training Progress</span>
                        <Badge variant="secondary">{trainingStatus.currentStage}</Badge>
                      </div>
                      <Progress value={trainingStatus.progress} className="w-full h-3" />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{trainingStatus.progress}% Complete</span>
                        <span>
                          Epoch {trainingStatus.currentEpoch || 0} / {trainingStatus.totalEpochs || 0}
                        </span>
                      </div>
                    </div>

                    {/* Training Metrics */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Accuracy</p>
                        <p className="text-2xl font-bold">
                          {trainingStatus.accuracy ? `${(trainingStatus.accuracy * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Loss</p>
                        <p className="text-2xl font-bold">
                          {trainingStatus.loss ? trainingStatus.loss.toFixed(4) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Session</p>
                        <p className="text-sm font-mono text-muted-foreground">
                          {trainingStatus.sessionId}
                        </p>
                      </div>
                    </div>

                    {/* Training Info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Started: {trainingStatus.startTime ? formatDate(trainingStatus.startTime) : 'N/A'}</span>
                      </div>
                      {trainingStatus.estimatedCompletion && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>ETA: {formatDate(trainingStatus.estimatedCompletion)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Click start to begin training a new LSTM model for BTC-USD with optimized parameters
                    </div>
                    <Button onClick={startTraining} className="w-full" size="lg">
                      <Play className="h-4 w-4 mr-2" />
                      Start Training
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Price Predictions
                </CardTitle>
                <CardDescription>
                  Generate and view cryptocurrency price forecasts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!predictionResult ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Generate a 7-day price prediction for BTC-USD using our trained LSTM model
                    </div>
                    <Button 
                      onClick={makePrediction} 
                      disabled={isLoadingPrediction}
                      className="w-full"
                      size="lg"
                    >
                      {isLoadingPrediction ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Prediction...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate Prediction
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Prediction Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{predictionResult.ticker}</h3>
                        <p className="text-sm text-muted-foreground">
                          Generated: {formatDate(predictionResult.generatedAt)}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={makePrediction}
                        disabled={isLoadingPrediction}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingPrediction ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    {/* Model Info */}
                    <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Model Type</p>
                        <p className="font-medium">{predictionResult.modelInfo.model_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Accuracy</p>
                        <p className="font-medium">{(predictionResult.modelInfo.accuracy * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Trained</p>
                        <p className="font-medium">{formatDate(predictionResult.modelInfo.last_trained)}</p>
                      </div>
                    </div>
                    
                    {/* Predictions Grid */}
                    <div className="grid gap-4">
                      {predictionResult.predictions.map((pred, index) => {
                        const previousPrice = index > 0 ? predictionResult.predictions[index - 1].price : pred.price;
                        const priceChange = pred.price - previousPrice;
                        const priceChangePercent = ((priceChange / previousPrice) * 100);
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{formatDate(pred.date)}</div>
                                <div className="text-sm text-muted-foreground">
                                  Confidence: {Math.round(pred.confidence * 100)}%
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-lg">{formatPrice(pred.price)}</div>
                                {getPriceChangeIcon(pred.price, previousPrice)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                              </div>
                              <Badge variant={pred.confidence > 0.8 ? 'default' : pred.confidence > 0.6 ? 'secondary' : 'outline'} className="text-xs">
                                {pred.confidence > 0.8 ? 'High' : pred.confidence > 0.6 ? 'Medium' : 'Low'} Confidence
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Analytics
                </CardTitle>
                <CardDescription>
                  Detailed system performance and analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* System Health */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">System Health</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <span>Database</span>
                        </div>
                        <Badge variant={serverStatus.health?.services?.database === 'healthy' ? 'default' : 'destructive'}>
                          {serverStatus.health?.services?.database || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          <span>Training Service</span>
                        </div>
                        <Badge variant={serverStatus.health?.services?.training_service === 'healthy' ? 'default' : 'destructive'}>
                          {serverStatus.health?.services?.training_service || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4" />
                          <span>WebSocket</span>
                        </div>
                        <Badge variant={serverStatus.isConnected ? 'default' : 'destructive'}>
                          {serverStatus.isConnected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Performance Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span>Total Predictions</span>
                        <span className="font-bold">{marketStats.totalPredictions}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span>Active Models</span>
                        <span className="font-bold">{marketStats.activeModels}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span>Average Accuracy</span>
                        <span className="font-bold">{marketStats.averageAccuracy.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span>Last Update</span>
                        <span className="font-bold">{formatDate(marketStats.lastUpdate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connection History */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Connection History</h3>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Last Health Check</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {serverStatus.lastChecked ? formatDate(serverStatus.lastChecked) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="widgets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  All Widgets
                </CardTitle>
                <CardDescription>
                  Comprehensive view of all available widgets and components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Market Overview Widget */}
                  <div className="h-96">
                    <MarketOverviewWidget />
                  </div>
                  
                  {/* Machine Learning Widget */}
                  <div className="h-96">
                    <MachineLearningWidget />
                  </div>
                  
                  {/* Technical Analysis Widget */}
                  <div className="h-96">
                    <LiveChartWidget />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
