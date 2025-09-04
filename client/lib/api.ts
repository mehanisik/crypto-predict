import server, { API_ENDPOINTS } from "./axios";

export interface HealthStatus {
	status: string;
	timestamp: string;
	version: string;
	services: {
		database: string;
		training_service: string;
	};
	uptime: string;
}

export interface TrainingRequest {
	ticker: string;
	model_type: "LSTM" | "CNN" | "CNN-LSTM" | "LSTM-CNN";
	start_date: string;
	end_date: string;
	lookback: number;
	epochs: number;
	batch_size?: number;
	learning_rate?: number;
}

export interface TrainingResponse {
	request_id: string;
	status: string;
	session_id: string;
	message: string;
}

export interface PredictionRequest {
	ticker: string;
	model_type?: string;
	start_date: string;
	days: number;
}

export interface PredictionResponse {
	request_id: string;
	status: string;
	data: {
		ticker: string;
		predictions: Array<{
			date: string;
			price: number;
			confidence: number;
		}>;
		model_config: {
			model_type: string;
			lookback_days: number;
			epochs: number;
		};
		data_range: {
			start_date: string;
			end_date: string;
			prediction_start: string;
		};
	};
}

export interface TrainingStatus {
	session_id: string;
	status: string;
	progress: {
		percentage: number;
		stage: string;
	};
	details: {
		id: number;
		session_id: string;
		ticker: string;
		model_type: string;
		start_date: string;
		end_date: string;
		lookback_days: number;
		epochs: number;
		batch_size: number | null;
		learning_rate: number | null;
		model_config_id: number;
		status: string;
		accuracy: number | null;
		loss: number | null;
		r2_score: number | null;
		mae: number | null;
		rmse: number | null;
		mape: number | null;
		model_file_path: string | null;
		training_logs: string | null;
		started_at: string;
		completed_at: string | null;
		created_at: string;
		updated_at: string;
	};
}

export interface RunningTrainingData {
	id: number;
	session_id: string;
	ticker: string;
	model_type: string;
	start_date: string;
	end_date: string;
	lookback_days: number;
	epochs: number;
	batch_size: number | null;
	learning_rate: number | null;
	model_config_id: number;
	status: string;
	accuracy: number | null;
	loss: number | null;
	r2_score: number | null;
	mae: number | null;
	rmse: number | null;
	mape: number | null;
	model_file_path: string | null;
	training_logs: string | null;
	started_at: string;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface RunningTrainings {
	running_trainings: RunningTrainingData[];
	count: number;
	max_sessions: number;
}

export class ApiService {
	static async getHealth(): Promise<HealthStatus> {
		const response = await server.get(API_ENDPOINTS.HEALTH);
		return response.data;
	}

	static async startTraining(data: TrainingRequest): Promise<TrainingResponse> {
		const response = await server.post(API_ENDPOINTS.TRAINING, data);
		return response.data;
	}

	static async getPrediction(
		data: PredictionRequest,
	): Promise<PredictionResponse> {
		const response = await server.post(API_ENDPOINTS.PREDICT, data);
		return response.data;
	}

	static async getTrainingStatus(sessionId: string): Promise<TrainingStatus> {
		const response = await server.get(API_ENDPOINTS.TRAINING_STATUS(sessionId));
		return response.data;
	}

	static async cancelTraining(
		sessionId: string,
	): Promise<{ success: boolean; message: string }> {
		const response = await server.post(
			API_ENDPOINTS.TRAINING_CANCEL(sessionId),
		);
		return response.data;
	}

	static async getRunningTrainings(): Promise<RunningTrainings> {
		const response = await server.get(API_ENDPOINTS.RUNNING_TRAININGS);
		return response.data;
	}
}

export const useApiService = () => {
	return {
		getHealth: ApiService.getHealth,
		startTraining: ApiService.startTraining,
		getPrediction: ApiService.getPrediction,
		getTrainingStatus: ApiService.getTrainingStatus,
		cancelTraining: ApiService.cancelTraining,
		getRunningTrainings: ApiService.getRunningTrainings,
	};
};

export default ApiService;
