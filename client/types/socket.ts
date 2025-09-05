// Base event interface
export interface BaseSocketEvent {
	session_id?: string;
	timestamp?: string;
	message?: string;
	error?: string;
}

export interface ConnectionEvent extends BaseSocketEvent {
	status: "connected" | "disconnected";
}

export interface RoomEvent extends BaseSocketEvent {
	session_id: string;
	status: "joined" | "left";
}

export interface PredictionRoomEvent extends BaseSocketEvent {
	request_id: string;
	status: "joined" | "left";
}

export type TrainingStage =
	| "data_fetching"
	| "data_fetched"
	| "preprocessing"
	| "feature_engineering"
	| "model_building"
	| "model_info"
	| "training_started"
	| "training_progress"
	| "training_update"
	| "metric_sample"
	| "series"
	| "evaluating_update"
	| "visualizing_update"
	| "training_completed"
	| "training_complete"
	| "idle"
	| "starting"
	| "unknown";

export interface TrainingProgressData {
	epoch: number;
	total_epochs: number;
	progress: number;
	accuracy: number;
	loss: number;
	val_loss?: number;
	status: "training";
	message: string;
}

export interface TrainingCompletionData {
	progress: number;
	epoch: number;
	total_epochs: number;
	final_accuracy: number;
	final_loss: number;
	r2_score?: number;
	mae?: number;
	rmse?: number;
	mape?: number;
	status: "completed";
	message: string;
}

export interface TrainingMetrics {
	accuracy: number;
	loss: number;
	r2_score?: number;
	mae?: number;
	rmse?: number;
	mape?: number;
}

export interface UnifiedServerMessage {
	session_id: string;
	phase:
		| "data"
		| "preprocess"
		| "features"
		| "build"
		| "train"
		| "evaluate"
		| "visualize"
		| "complete"
		| "error";
	event: string;
	timestamp: string;
	progress?: number;
	data: Record<string, unknown>;
}

export interface LegacyServerMessage extends BaseSocketEvent {
	type?: TrainingStage;
	data_type?: string; // legacy field
	progress?: number;
	data?: Record<string, unknown>;
}

export type ServerMessage = UnifiedServerMessage | LegacyServerMessage;

export interface TrainingUpdateEvent extends BaseSocketEvent {
	// Unified fields
	phase?:
		| "data"
		| "preprocess"
		| "features"
		| "build"
		| "train"
		| "evaluate"
		| "visualize"
		| "complete"
		| "error";
	event?: string; // unified event name

	type?: TrainingStage;
	data_type?: string;

	progress?: number;
	epoch?: number;
	total_epochs?: number;
	accuracy?: number;
	loss?: number;
	val_loss?: number;
	final_accuracy?: number;
	final_loss?: number;
	r2_score?: number;
	mae?: number;
	rmse?: number;
	mape?: number;

	data?:
		| TrainingProgressData
		| TrainingCompletionData
		| Record<string, unknown>;
	metrics?: Record<string, number>;
	series?: Record<string, number[]>;

	status?: "training" | "completed" | "failed";
	message?: string;
}

export interface ErrorEvent extends BaseSocketEvent {
	message: string;
	code?: string;
	details?: Record<string, unknown>;
}

export interface PredictionUpdateEvent extends BaseSocketEvent {
	type:
		| "prediction_started"
		| "prediction_progress"
		| "prediction_completed"
		| "prediction_failed";
	progress?: number;
	data?: Record<string, unknown>;
	predictions?: Array<{
		date: string;
		price: number;
		confidence?: number;
	}>;
	message: string;
}

export interface WebSocketState {
	isConnected: boolean;
	isConnecting: boolean;
	error: string | null;
	lastConnectedAt: Date | null;
	lastDisconnectedAt: Date | null;
	connectionAttempts: number;
}

export type SocketEventName =
	| "connect"
	| "disconnect"
	| "connected"
	| "join_training"
	| "leave_training"
	| "joined_training"
	| "left_training"
	| "join_prediction"
	| "leave_prediction"
	| "joined_prediction"
	| "left_prediction"
	| "training_update"
	| "prediction_update"
	| "error_update"
	| "reconnect"
	| "reconnect_attempt"
	| "reconnect_error"
	| "reconnect_failed"
	// Individual stage events (legacy support)
	| "data_fetching"
	| "data_fetched"
	| "preprocessing"
	| "feature_engineering"
	| "model_building"
	| "model_info"
	| "training_progress"
	| "evaluating_update"
	| "visualizing_update"
	| "training_completed";

export interface TrainingConfig {
	ticker: string;
	modelType: "CNN" | "LSTM" | "CNN-LSTM" | "LSTM-CNN";
	startDate: string;
	endDate: string;
	lookback: number;
	epochs: number;
	batchSize: number;
	learningRate: number;
}

export interface TrainingRequest {
	ticker: string;
	model_type: "CNN" | "LSTM" | "CNN-LSTM" | "LSTM-CNN";
	start_date: string;
	end_date: string;
	lookback: number;
	epochs: number;
	batch_size: number;
	learning_rate: number;
}

export interface TrainingResponse {
	success: boolean;
	message: string;
	session_id?: string;
	error?: string;
}

export interface PredictionRequest {
	ticker: string;
	start_date: string;
	days: number;
}

export interface PredictionResponse {
	success: boolean;
	message: string;
	predictions?: Array<{
		date: string;
		price: number;
		confidence?: number;
	}>;
	error?: string;
}
