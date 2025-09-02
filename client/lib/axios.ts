import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';
const API_VERSION = 'v1';

const server = axios.create({
  baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  transformRequest: [
    (data) => {
      if (data) {
        return JSON.stringify(data);
      }
      return data;
    },
  ],
});

server.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

server.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      console.error('❌ Network Error: No response received');
    } else {
      console.error('❌ Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default server;

export const API_ENDPOINTS = {
  HEALTH: '/health',
  TRAINING: '/train',
  TRAINING_STATUS: (sessionId: string) => `/train/${sessionId}/status`,
  TRAINING_CANCEL: (sessionId: string) => `/train/${sessionId}/cancel`,
  RUNNING_TRAININGS: '/train/running',
  PREDICT: '/predict',
} as const;

export const getApiUrl = (endpoint: string) => `${API_BASE_URL}/api/${API_VERSION}${endpoint}`;
