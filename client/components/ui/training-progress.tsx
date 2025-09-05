"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp } from "lucide-react";
import { useMlModelStore } from "@/store";

export function TrainingProgress() {
	const messages = useMlModelStore((s) => s.messages);
	const isTrainingComplete = useMlModelStore((s) => s.isTrainingComplete);

	const progress = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			const p = messages[i].progress;
			if (typeof p === "number" && !Number.isNaN(p)) return Math.round(p);
		}
		return 0;
	}, [messages]);

	const currentStage = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			const e = messages[i].event;
			if (typeof e === "string" && e) return e;
		}
		return "training_update";
	}, [messages]);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						Training Progress
						<Badge variant="outline" className="ml-auto">
							{progress}%
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Progress value={progress} className="h-3 mb-4" />
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>Current: {currentStage}</span>
						{isTrainingComplete && (
							<span className="flex items-center gap-2 text-green-600">
								<CheckCircle className="h-4 w-4" />
								Completed
							</span>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
