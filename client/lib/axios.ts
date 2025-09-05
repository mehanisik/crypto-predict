import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_VERSION = "v1";

const server = axios.create({
	baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
	headers: {
		"Content-Type": "application/json",
	},
});

server.interceptors.request.use(
	(config) => {
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

server.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		return Promise.reject(error);
	},
);

export default server;

export const API_ENDPOINTS = {
	HEALTH: "/health",
	TRAINING: "/train",
	TRAINING_STATUS: (sessionId: string) => `/train/${sessionId}/status`,
	TRAINING_CANCEL: (sessionId: string) => `/train/${sessionId}/cancel`,
	RUNNING_TRAININGS: "/train/running",
	PREDICT: "/predict",
} as const;

const _getApiUrl = (endpoint: string) =>
	`${API_BASE_URL}/api/${API_VERSION}${endpoint}`;
