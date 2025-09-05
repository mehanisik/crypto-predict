import { create } from "zustand";
import {
	Step,
	type TrainingParams,
	type PredictionParams,
	type ConnectionState,
	type MlMessage,
} from "@/types/ml-model";

interface MlModelState {
	step: Step;
	connection: ConnectionState;
	training: TrainingParams;
	prediction: PredictionParams;
	messages: MlMessage[];
	plots: Record<string, string>;
	seriesMap: Record<string, number[]>;
	autoScroll: boolean;
	isTrainingComplete: boolean;
	setStep: (s: Step) => void;
	setConnection: (partial: Partial<ConnectionState>) => void;
	setTraining: (partial: Partial<TrainingParams>) => void;
	setPrediction: (partial: Partial<PredictionParams>) => void;
	addMessage: (m: MlMessage) => void;
	clearMessages: () => void;
	setPlots: (
		updater: (prev: Record<string, string>) => Record<string, string>,
	) => void;
	setSeriesMap: (
		updater: (prev: Record<string, number[]>) => Record<string, number[]>,
	) => void;
	setAutoScroll: (v: boolean) => void;
	setTrainingComplete: (v: boolean) => void;
}

export const useMlModelStore = create<MlModelState>((set) => ({
	step: Step.Configure,
	connection: { isConnected: false, activeSessionId: null },
	training: {
		ticker: "ETH-USD",
		modelType: "LSTM",
		startDate: "2023-01-01",
		endDate: "2024-01-01",
		lookback: 60,
		epochs: 10,
		batchSize: 32,
		learningRate: 0.001,
	},
	prediction: {
		predStartDate: "2024-01-02",
		predDays: 7,
	},
	messages: [],
	plots: {},
	seriesMap: {},
	autoScroll: true,
	isTrainingComplete: false,

	setStep: (s) => set({ step: s }),
	setConnection: (partial) =>
		set((state) => ({ connection: { ...state.connection, ...partial } })),
	setTraining: (partial) =>
		set((state) => ({ training: { ...state.training, ...partial } })),
	setPrediction: (partial) =>
		set((state) => ({ prediction: { ...state.prediction, ...partial } })),
	addMessage: (m) =>
		set((state) => {
			const next = [...state.messages, m];
			const complete = next.some(
				(x) =>
					x.event === "training_completed" || x.event === "training_complete",
			);
			return { messages: next, isTrainingComplete: complete };
		}),
	clearMessages: () => set({ messages: [], isTrainingComplete: false }),
	setPlots: (updater) => set((state) => ({ plots: updater(state.plots) })),
	setSeriesMap: (updater) =>
		set((state) => ({ seriesMap: updater(state.seriesMap) })),
	setAutoScroll: (v) => set({ autoScroll: v }),
	setTrainingComplete: (v) => set({ isTrainingComplete: v }),
}));

export const selectConnection = (s: MlModelState) => s.connection;
export const selectTraining = (s: MlModelState) => s.training;
export const selectPrediction = (s: MlModelState) => s.prediction;
export const selectMessages = (s: MlModelState) => s.messages;
export const selectDerived = (s: MlModelState) => ({
	step: s.step,
	isTrainingComplete: s.isTrainingComplete,
});
