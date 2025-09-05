"use client";

import { Widget } from "../ui/widget";
import { ConfigureModelStep } from "./ml-model/steps/configure-model";
import { TrainingProgressStep } from "./ml-model/steps/training-progress";
import { PredictionStep } from "./ml-model/steps/prediction";
import { Step } from "@/types/ml-model";
import { useMlModelStore } from "@/store";
import { useSocket } from "@/hooks/use-socket";
import { useEffect } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, RotateCcw, TrendingUp } from "lucide-react";

export default function MachineLearningWidget() {
	const { connection, step, isTrainingComplete, setStep } = useMlModelStore();
	const socket = useSocket();

	useEffect(() => {
		if (
			connection.activeSessionId &&
			socket?.isConnected &&
			socket?.joinTrainingRoom
		) {
			socket.joinTrainingRoom(connection.activeSessionId);
		}
	}, [
		connection.activeSessionId,
		socket?.isConnected,
		socket?.joinTrainingRoom,
	]);

	// Auto-transition to prediction step when training completes
	useEffect(() => {
		if (isTrainingComplete && step === Step.Train) {
			setStep(Step.Predict);
		}
	}, [isTrainingComplete, step, setStep]);

	if (!socket) {
		return <div>Socket initialization error</div>;
	}

	return (
		<Widget
			title="Machine Learning Model"
			headerContent={
				<div className="flex items-center gap-3">
					{step === Step.Train && isTrainingComplete && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setStep(Step.Predict)}
							className="h-7 px-2 text-xs"
						>
							<TrendingUp className="h-3 w-3 mr-1" />
							Predict
						</Button>
					)}
					{step === Step.Predict && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setStep(Step.Train)}
							className="h-7 px-2 text-xs"
						>
							<ArrowLeft className="h-3 w-3 mr-1" />
							Back to Training
						</Button>
					)}
					{step === Step.Train && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setStep(Step.Configure)}
							className="h-7 px-2 text-xs"
						>
							<RotateCcw className="h-3 w-3 mr-1" />
							New Training
						</Button>
					)}

					<span
						className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
							socket?.isConnected
								? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
								: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
						}`}
					>
						{socket?.isConnected ? "Connected" : "Disconnected"}
						{connection.activeSessionId ? (
							<span className="ml-2 text-[10px] opacity-70">
								{connection.activeSessionId}
							</span>
						) : null}
					</span>
				</div>
			}
			fullHeight
			contentClassName="flex h-full p-4"
		>
			<div className="flex h-full w-full flex-col gap-6 overflow-hidden">
				<div className="flex-1 min-h-0 flex">
					<div className="flex-1 min-h-0">
						{step === Step.Configure && <ConfigureModelStep />}
						{step === Step.Train && <TrainingProgressStep />}
						{step === Step.Predict && <PredictionStep />}
					</div>
				</div>
			</div>
		</Widget>
	);
}
