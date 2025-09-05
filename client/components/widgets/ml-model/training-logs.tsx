"use client";

import {
	CheckCircle2,
	Database,
	LineChart,
	Rocket,
	Timer,
	Wrench,
} from "lucide-react";

import { useMlModelStore } from "@/store";
import { useRef } from "react";

interface MessageRecord {
	index: number;
	timestamp: string;
	event: string;
	progress?: number;
	session_id?: string;
	data?: Record<string, unknown>;
}

export function TrainingLogs() {
	const messages = useMlModelStore((s) => s.messages);
	const autoScroll = useMlModelStore((s) => s.autoScroll);
	const setAutoScroll = useMlModelStore((s) => s.setAutoScroll);
	const clearMessages = useMlModelStore((s) => s.clearMessages);
	const containerRef = useRef<HTMLDivElement | null>(null);

	const eventMeta = (event: string) => {
		switch (event) {
			case "data_fetching":
				return {
					label: "Fetching",
					className:
						"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
					Icon: Database,
				};
			case "training_started":
				return {
					label: "Started",
					className:
						"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
					Icon: Rocket,
				};
			case "training_progress":
				return {
					label: "Progress",
					className:
						"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
					Icon: Timer,
				};
			case "metric_sample":
				return {
					label: "Metrics",
					className:
						"bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
					Icon: LineChart,
				};
			case "training_completed":
			case "training_complete":
				return {
					label: "Complete",
					className:
						"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
					Icon: CheckCircle2,
				};
			default:
				return {
					label: event.replaceAll("_", " "),
					className: "bg-muted text-foreground/80",
					Icon: Wrench,
				};
		}
	};

	const getMessageSummary = (m: MessageRecord) => {
		const data = (m.data as Record<string, unknown>) || {};
		if (typeof data.message === "string" && data.message.trim().length > 0) {
			return data.message as string;
		}
		if (m.event === "metric_sample") {
			const epoch = data.epoch as number | undefined;
			const total = data.total_epochs as number | undefined;
			const metrics = data.metrics as Record<string, number> | undefined;
			const acc = metrics?.accuracy;
			const loss = metrics?.loss;
			const parts: string[] = [];
			if (epoch !== undefined && total !== undefined)
				parts.push(`Epoch ${epoch}/${total}`);
			if (typeof acc === "number") parts.push(`acc ${acc.toFixed(3)}`);
			if (typeof loss === "number") parts.push(`loss ${loss.toFixed(3)}`);
			return parts.join(" • ") || "Metric update";
		}
		if (m.event === "data_fetching") {
			const t = data.ticker as string | undefined;
			const s = data.start_date as string | undefined;
			const e = data.end_date as string | undefined;
			if (t && s && e) return `Fetching ${t} ${s} → ${e}`;
		}
		if (m.event === "training_progress" && typeof m.progress === "number") {
			return `Progress updated to ${Math.round(m.progress)}%`;
		}
		return eventMeta(m.event).label;
	};

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between gap-2 mb-2">
				<div className="text-sm text-muted-foreground">
					Training updates will appear below.
				</div>
				<div className="flex items-center gap-2">
					<label className="flex items-center gap-1 text-xs text-muted-foreground">
						<input
							type="checkbox"
							checked={autoScroll}
							onChange={(e) => setAutoScroll(e.target.checked)}
						/>
						Auto-scroll
					</label>
					<button
						type="button"
						onClick={clearMessages}
						className="rounded border px-2 py-1 text-xs hover:bg-muted"
					>
						Clear
					</button>
				</div>
			</div>

			<div
				ref={containerRef}
				className="relative flex-1 overflow-auto rounded border bg-muted/20"
			>
				<ul className="divide-y">
					{messages.map((m) => {
						const meta = eventMeta(m.event);
						const Icon = meta.Icon;
						const summary = getMessageSummary(m);
						return (
							<li key={m.index} className="p-2">
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-center gap-2">
										<span
											className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${meta.className}`}
										>
											<Icon className="h-3 w-3" />
											{meta.label}
										</span>
									</div>
									<span className="shrink-0 text-[11px] text-muted-foreground">
										{new Date(m.timestamp).toLocaleTimeString()}
									</span>
								</div>

								{summary && (
									<div className="mt-1 text-xs text-foreground/90">
										{summary}
									</div>
								)}

								{m.data && Object.keys(m.data).length > 0 && (
									<details className="mt-2 group">
										<summary className="cursor-pointer list-none text-[11px] text-muted-foreground transition-colors hover:text-foreground">
											Payload
										</summary>
										<pre className="mt-1 rounded bg-background p-2 text-[11px] leading-relaxed">
											{JSON.stringify(m.data, null, 2)}
										</pre>
									</details>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
