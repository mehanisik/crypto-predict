"use client";

import { TrainingStatus } from "../training-status";
import { TrainingCharts } from "../training-charts";
import { TrainingLogs } from "../training-logs";

export function TrainingProgressStep() {
	return (
		<div className="space-y-4 h-full flex flex-col">
			<TrainingStatus />
			<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="min-h-0">
					<TrainingCharts />
				</div>
				<div className="min-h-0 flex flex-col">
					<TrainingLogs />
				</div>
			</div>
		</div>
	);
}
