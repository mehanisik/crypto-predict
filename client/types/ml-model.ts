export const Step = {
	Configure: 1,
	Train: 2,
	Predict: 3,
} as const;
export type Step = (typeof Step)[keyof typeof Step];

export type ModelType = "LSTM" | "CNN" | "CNN-LSTM" | "LSTM-CNN";

export interface TrainingParams {
	ticker: string;
	modelType: ModelType;
	startDate: string;
	endDate: string;
	lookback: number;
	epochs: number;
	batchSize?: number;
	learningRate?: number;
}

export interface PredictionParams {
	predStartDate: string;
	predDays: number;
}

export interface ConnectionState {
	isConnected: boolean;
	activeSessionId: string | null;
}

export interface MlMessage {
	index: number;
	timestamp: string;
	event: string;
	progress?: number;
	session_id?: string;
	data?: Record<string, unknown>;
}

export interface StartTrainingPayload {
	ticker: string;
	model_type: ModelType;
	start_date: string;
	end_date: string;
	lookback: number;
	epochs: number;
	batch_size?: number;
	learning_rate?: number;
}

export interface StartTrainingResponse {
	session_id?: string;
	request_id?: string;
	status?: string;
	message?: string;
}

export interface PredictionPayload {
	ticker: string;
	start_date: string;
	days: number;
}

export interface PredictionResultItem {
	date: string;
	price?: number;
	predicted_price?: number;
	confidence_score?: number;
	confidence_interval?: number;
	lower_bound?: number;
	upper_bound?: number;
}

export interface PredictionResponse {
	ticker?: string;
	predictions?: PredictionResultItem[];
	data_range?: {
		start_date: string;
		end_date: string;
		prediction_start: string;
	};
	model_config?: {
		model_type: string;
		lookback_days: number;
		epochs: number;
	};
	request_id?: string;
	status?: string;
}
