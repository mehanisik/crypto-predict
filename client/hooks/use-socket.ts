"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type {
	TrainingUpdateEvent,
	UnifiedServerMessage,
	LegacyServerMessage,
	TrainingStage,
} from "@/types/socket";
import { useMlModelStore } from "@/store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5000";

interface SocketState {
	isConnected: boolean;
	isConnecting: boolean;
	error: string | null;
	lastConnectedAt: Date | null;
	lastDisconnectedAt: Date | null;
	connectionAttempts: number;
}

interface RoomManager {
	joinedRooms: Set<string>;
	desiredRooms: Set<string>;
	addRoom: (roomKey: string) => void;
	removeRoom: (roomKey: string) => void;
	hasRoom: (roomKey: string) => boolean;
	getRooms: () => string[];
}

const createRoomManager = (): RoomManager => {
	const joinedRooms = new Set<string>();
	const desiredRooms = new Set<string>();

	return {
		joinedRooms,
		desiredRooms,
		addRoom: (roomKey: string) => {
			joinedRooms.add(roomKey);
			desiredRooms.add(roomKey);
		},
		removeRoom: (roomKey: string) => {
			joinedRooms.delete(roomKey);
			desiredRooms.delete(roomKey);
		},
		hasRoom: (roomKey: string) => joinedRooms.has(roomKey),
		getRooms: () => Array.from(desiredRooms),
	};
};

export function useSocket() {
	const [state, setState] = useState<SocketState>({
		isConnected: false,
		isConnecting: false,
		error: null,
		lastConnectedAt: null,
		lastDisconnectedAt: null,
		connectionAttempts: 0,
	});

	const addMessage = useMlModelStore((s) => s.addMessage);
	const setPlots = useMlModelStore((s) => s.setPlots);
	const setSeriesMap = useMlModelStore((s) => s.setSeriesMap);

	const socketRef = useRef<Socket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const isManualDisconnectRef = useRef(false);
	const roomManagerRef = useRef<RoomManager>(createRoomManager());

	const MAX_RECONNECT_ATTEMPTS = 10;
	const RECONNECT_DELAY = 1000;

	const clearReconnectTimer = () => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
	};

	const processTrainingUpdate = useCallback(
		(payload: Record<string, unknown>) => {
			const isUnified = "phase" in payload && "event" in payload;
			const isLegacy = "type" in payload || "data_type" in payload;

			let normalized: TrainingUpdateEvent = {};

			if (isUnified) {
				const unifiedPayload = payload as unknown as UnifiedServerMessage;
				const event = unifiedPayload.event;
				const progress = unifiedPayload.progress;
				const sessionId = unifiedPayload.session_id;
				const data = unifiedPayload.data || {};
				const timestamp = unifiedPayload.timestamp;

				normalized = {
					phase: unifiedPayload.phase,
					event,
					type: event as TrainingStage,
					progress,
					session_id: sessionId,
					timestamp,
					data: data as Record<string, unknown>,
					message: (data.message as string) || `Training ${event}`,
					...data,
				};
			} else if (isLegacy) {
				const legacyPayload = payload as LegacyServerMessage;
				const type = (legacyPayload.type ||
					legacyPayload.data_type) as TrainingStage;
				const progress = legacyPayload.progress;
				const sessionId = legacyPayload.session_id;
				const data = legacyPayload.data || {};
				const timestamp = legacyPayload.timestamp || new Date().toISOString();

				normalized = {
					type,
					event: type, // Map type to event for unified handling
					progress,
					session_id: sessionId,
					timestamp,
					data: data as Record<string, unknown>,
					message:
						(data.message as string) ||
						(legacyPayload.message as string) ||
						`Training ${type}`,
					...data,
				};
			} else {
				// Fallback for unknown format
				normalized = {
					event: "unknown",
					type: "unknown" as TrainingStage,
					timestamp: new Date().toISOString(),
					data: payload as Record<string, unknown>,
					message: "Unknown training update",
				};
			}

			// Process the training update and update store
			const timestamp = normalized.timestamp || new Date().toISOString();
			const eventName = normalized.event || normalized.type || "unknown";
			const progress = normalized.progress;
			const sessionId = normalized.session_id;
			const data = normalized.data;

			addMessage({
				index: Date.now(),
				timestamp,
				event: eventName,
				progress,
				session_id: sessionId,
				data: data as Record<string, unknown>,
			});

			try {
				if (eventName === "series" && data && typeof data === "object") {
					const seriesData = data as Record<string, unknown>;
					if (seriesData.series && typeof seriesData.series === "object") {
						const series = seriesData.series as Record<string, unknown>;

						// Extract plot URLs
						const urlEntries = Object.entries(series).filter(
							([, v]) =>
								typeof v === "string" && /^(https?:\/\/|\/)/.test(v as string),
						) as Array<[string, string]>;
						if (urlEntries.length > 0) {
							setPlots((prev) => ({
								...prev,
								...Object.fromEntries(urlEntries),
							}));
						}

						const numericEntries = Object.entries(series).filter(
							([, v]) =>
								Array.isArray(v) &&
								(v as unknown[]).every((n) => typeof n === "number"),
						) as Array<[string, number[]]>;
						if (numericEntries.length > 0) {
							setSeriesMap((prev) => ({
								...prev,
								...Object.fromEntries(numericEntries),
							}));
						}
					}
				}

				if (eventName === "metric_sample" && data && typeof data === "object") {
					const metricData = data as Record<string, unknown>;
					if (metricData.metrics && typeof metricData.metrics === "object") {
						const metrics = metricData.metrics as Record<string, number>;
						setSeriesMap((prev) => ({
							...prev,
							accuracy: [
								...(prev.accuracy || []),
								...(typeof metrics.accuracy === "number"
									? [metrics.accuracy]
									: []),
							],
							loss: [
								...(prev.loss || []),
								...(typeof metrics.loss === "number" ? [metrics.loss] : []),
							],
							val_accuracy: [
								...(prev.val_accuracy || []),
								...(typeof metrics.val_accuracy === "number"
									? [metrics.val_accuracy]
									: []),
							],
							val_loss: [
								...(prev.val_loss || []),
								...(typeof metrics.val_loss === "number"
									? [metrics.val_loss]
									: []),
							],
						}));
					}
				}

				// Handle training progress
				if (
					eventName === "training_progress" &&
					data &&
					typeof data === "object"
				) {
					const progressData = data as Record<string, unknown>;
					const acc = progressData.accuracy as number | undefined;
					const loss = progressData.loss as number | undefined;
					if (typeof acc === "number" || typeof loss === "number") {
						setSeriesMap((prev) => ({
							...prev,
							accuracy: [
								...(prev.accuracy || []),
								...(typeof acc === "number" ? [acc] : []),
							],
							loss: [
								...(prev.loss || []),
								...(typeof loss === "number" ? [loss] : []),
							],
						}));
					}
				}
			} catch (error) {
				console.error("Error processing training update:", error);
			}

			window.dispatchEvent(
				new CustomEvent("training_update", { detail: normalized }),
			);
		},
		[addMessage, setPlots, setSeriesMap],
	);

	const setupSocketListeners = useCallback(
		(socket: Socket) => {
			socket.on("connect", () => {
				setState((prev) => ({
					...prev,
					isConnected: true,
					isConnecting: false,
					error: null,
					lastConnectedAt: new Date(),
					connectionAttempts: 0,
				}));
				reconnectAttemptsRef.current = 0;
				isManualDisconnectRef.current = false;

				const roomManager = roomManagerRef.current;
				roomManager.getRooms().forEach((roomKey) => {
					if (roomKey.startsWith("training_")) {
						const sessionId = roomKey.replace("training_", "");
						socket.emit("join_training", { session_id: sessionId });
						roomManager.addRoom(roomKey);
					} else if (roomKey.startsWith("prediction_")) {
						const requestId = roomKey.replace("prediction_", "");
						socket.emit("join_prediction", { request_id: requestId });
						roomManager.addRoom(roomKey);
					}
				});
			});

			socket.on("connected", () => {
				// Server confirmed connection
			});

			socket.on("disconnect", (reason) => {
				setState((prev) => ({
					...prev,
					isConnected: false,
					isConnecting: false,
					lastDisconnectedAt: new Date(),
				}));

				if (!isManualDisconnectRef.current) {
					scheduleReconnection();
				}
			});

			socket.on("connect_error", (error) => {
				setState((prev) => ({
					...prev,
					isConnected: false,
					isConnecting: false,
					error: error.message,
					lastDisconnectedAt: new Date(),
				}));

				if (!isManualDisconnectRef.current) {
					scheduleReconnection();
				}
			});

			socket.on("joined_training", () => {
				// Successfully joined training room
			});

			socket.on("left_training", () => {
				// Left training room
			});

			socket.on("error_update", (data) => {
				setState((prev) => ({
					...prev,
					error: data.message || "Server error occurred",
				}));
			});

			socket.on("joined_prediction", () => {
				// Joined prediction room
			});

			socket.on("left_prediction", () => {
				// Left prediction room
			});

			socket.on("prediction_update", (data) => {
				window.dispatchEvent(
					new CustomEvent("prediction_update", { detail: data }),
				);
			});

			// Handle individual stage events (legacy support)
			const stageEvents = [
				"data_fetching",
				"data_fetched",
				"preprocessing",
				"feature_engineering",
				"model_building",
				"model_info",
				"training_progress",
				"evaluating_update",
				"visualizing_update",
				"training_completed",
			];

			stageEvents.forEach((eventName) => {
				socket.on(eventName, (data) => {
					// Convert individual stage event to unified format
					const unifiedData = {
						session_id: data.session_id || "unknown",
						phase: eventName.includes("data")
							? "data"
							: eventName.includes("preprocess")
								? "preprocess"
								: eventName.includes("feature")
									? "features"
									: eventName.includes("model")
										? "build"
										: eventName.includes("training")
											? "train"
											: eventName.includes("evaluating")
												? "evaluate"
												: eventName.includes("visualizing")
													? "visualize"
													: eventName.includes("completed")
														? "complete"
														: "train",
						event: eventName,
						timestamp: data.timestamp || new Date().toISOString(),
						progress: data.progress,
						data: data.data || data,
					};

					processTrainingUpdate(unifiedData);
				});
			});

			socket.on("training_update", (payload: Record<string, unknown>) => {
				processTrainingUpdate(payload);
			});
		},
		[processTrainingUpdate],
	);

	const scheduleReconnection = useCallback(() => {
		if (
			reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS ||
			isManualDisconnectRef.current
		) {
			setState((prev) => ({
				...prev,
				error: `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`,
				isConnecting: false,
			}));
			return;
		}

		clearReconnectTimer();
		const delay = Math.min(
			RECONNECT_DELAY * 2 ** reconnectAttemptsRef.current,
			30000,
		);

		reconnectTimeoutRef.current = setTimeout(() => {
			reconnectAttemptsRef.current++;
			if (socketRef.current?.connected) return;

			setState((prev) => ({ ...prev, isConnecting: true, error: null }));

			const socket = io(WS_URL, {
				path: "/socket.io/",
				withCredentials: false,
				transports: ["websocket", "polling"],
				upgrade: true,
				autoConnect: true,
				reconnection: false,
				timeout: 15000,
			});

			socketRef.current = socket;
			setupSocketListeners(socket);
		}, delay);
	}, [setupSocketListeners]);

	const connect = useCallback(() => {
		if (socketRef.current?.connected) return;

		setState((prev) => ({ ...prev, isConnecting: true, error: null }));

		const socket = io(WS_URL, {
			path: "/socket.io/",
			withCredentials: false,
			transports: ["websocket", "polling"],
			upgrade: true,
			autoConnect: true,
			reconnection: false,
			timeout: 15000,
		});

		socketRef.current = socket;
		setupSocketListeners(socket);
	}, [setupSocketListeners]);

	const disconnect = useCallback(() => {
		isManualDisconnectRef.current = true;
		clearReconnectTimer();
		if (socketRef.current) {
			socketRef.current.disconnect();
			socketRef.current = null;
		}
		setState((prev) => ({
			...prev,
			isConnected: false,
			isConnecting: false,
			error: null,
		}));
	}, []);

	const reconnect = useCallback(() => {
		isManualDisconnectRef.current = false;
		disconnect();
		reconnectAttemptsRef.current = 0;
		setTimeout(() => connect(), 100);
	}, [disconnect, connect]);

	const joinTrainingRoom = useCallback((sessionId: string) => {
		if (socketRef.current?.connected) {
			const roomKey = `training_${sessionId}`;
			const roomManager = roomManagerRef.current;

			if (roomManager.hasRoom(roomKey)) {
				return;
			}

			socketRef.current.emit("join_training", { session_id: sessionId });
			roomManager.addRoom(roomKey);
		}
	}, []);

	const leaveTrainingRoom = useCallback((sessionId: string) => {
		if (socketRef.current?.connected) {
			const roomKey = `training_${sessionId}`;
			socketRef.current.emit("leave_training", { session_id: sessionId });
			roomManagerRef.current.removeRoom(roomKey);
		}
	}, []);

	const joinPredictionRoom = useCallback((requestId: string) => {
		if (socketRef.current?.connected) {
			const roomKey = `prediction_${requestId}`;
			const roomManager = roomManagerRef.current;

			if (roomManager.hasRoom(roomKey)) {
				return;
			}

			socketRef.current.emit("join_prediction", { request_id: requestId });
			roomManager.addRoom(roomKey);
		}
	}, []);

	const leavePredictionRoom = useCallback((requestId: string) => {
		if (socketRef.current?.connected) {
			const roomKey = `prediction_${requestId}`;
			socketRef.current.emit("leave_prediction", { request_id: requestId });
			roomManagerRef.current.removeRoom(roomKey);
		}
	}, []);

	useEffect(() => {
		connect();
		return () => disconnect();
	}, [connect, disconnect]);

	return {
		isConnected: state.isConnected,
		isConnecting: state.isConnecting,
		error: state.error,
		connectionAttempts: state.connectionAttempts,
		connect,
		disconnect,
		reconnect,
		joinTrainingRoom,
		leaveTrainingRoom,
		joinPredictionRoom,
		leavePredictionRoom,
	};
}
