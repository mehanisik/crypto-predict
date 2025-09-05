import { Settings, TrendingUp, Zap, Target } from "lucide-react";

export const TrainingPresets = [
	{
		name: "Quick Test",
		description: "Fast training for testing",
		icon: Zap,
		config: {
			ticker: "ETH-USD",
			modelType: "LSTM" as const,
			startDate: "2024-01-01",
			endDate: "2024-06-01",
			lookback: 30,
			epochs: 5,
			batchSize: 32,
			learningRate: 0.001,
		},
	},
	{
		name: "Production Ready",
		description: "Optimized for accuracy",
		icon: Target,
		config: {
			ticker: "BTC-USD",
			modelType: "CNN-LSTM" as const,
			startDate: "2023-01-01",
			endDate: "2024-01-01",
			lookback: 60,
			epochs: 50,
			batchSize: 64,
			learningRate: 0.0005,
		},
	},
	{
		name: "High Performance",
		description: "Maximum accuracy setup",
		icon: TrendingUp,
		config: {
			ticker: "ETH-USD",
			modelType: "LSTM-CNN" as const,
			startDate: "2022-01-01",
			endDate: "2024-01-01",
			lookback: 90,
			epochs: 100,
			batchSize: 128,
			learningRate: 0.0001,
		},
	},
	{
		name: "Custom",
		description: "Configure manually",
		icon: Settings,
		config: null,
	},
];
