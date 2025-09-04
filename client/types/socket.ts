// Socket Event Types for Crypto Prediction App

// Base event interface
export interface BaseSocketEvent {
	session_id?: string;
	timestamp?: string;
	message?: string;
	error?: string;
}

// Connection events
export interface ConnectionEvent extends BaseSocketEvent {
	status: "connected" | "disconnected";
}

// Room join/leave events
export interface RoomEvent extends BaseSocketEvent {
	session_id: string;
	status: "joined" | "left";
}

export interface PredictionRoomEvent extends BaseSocketEvent {
	request_id: string;
	status: "joined" | "left";
}

// Training stage types
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
	| "starting";

// Training progress data
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

// Training completion data
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

// Training metrics
export interface TrainingMetrics {
	accuracy: number;
	loss: number;
	r2_score?: number;
	mae?: number;
	rmse?: number;
	mape?: number;
}

// Server unified message structure
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

// Legacy server message structure
export interface LegacyServerMessage extends BaseSocketEvent {
	type?: TrainingStage;
	data_type?: string; // legacy field
	progress?: number;
	data?: Record<string, unknown>;
}

// Combined message type (server sends this)
export type ServerMessage = UnifiedServerMessage | LegacyServerMessage;

// Training update event (client receives this)
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

	// Legacy fields for backward compatibility
	type?: TrainingStage;
	data_type?: string;

	// Progress and metrics
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

	// Data payloads
	data?:
		| TrainingProgressData
		| TrainingCompletionData
		| Record<string, unknown>;
	metrics?: Record<string, number>; // server sends actual numbers
	series?: Record<string, number[]>;

	// Status
	status?: "training" | "completed" | "failed";
	message?: string;
}

// Error event
export interface ErrorEvent extends BaseSocketEvent {
	message: string;
	code?: string;
	details?: Record<string, unknown>;
}

// Prediction events
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

// WebSocket state
export interface WebSocketState {
	isConnected: boolean;
	isConnecting: boolean;
	error: string | null;
	lastConnectedAt: Date | null;
	lastDisconnectedAt: Date | null;
	connectionAttempts: number;
}

// Socket event names
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
	| "reconnect_failed";

// Training configuration
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

// Training request (API)
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

// Training response
export interface TrainingResponse {
	success: boolean;
	message: string;
	session_id?: string;
	error?: string;
}

// Prediction request
export interface PredictionRequest {
	ticker: string;
	start_date: string;
	days: number;
}

// Prediction response
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

// These interfaces are already exported above
