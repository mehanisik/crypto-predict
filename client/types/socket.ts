// Base event interface
interface BaseSocketEvent {
	session_id?: string;
	timestamp?: string;
	message?: string;
	error?: string;
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

interface TrainingProgressData {
	epoch: number;
	total_epochs: number;
	progress: number;
	accuracy: number;
	loss: number;
	val_loss?: number;
	status: "training";
	message: string;
}

interface TrainingCompletionData {
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
