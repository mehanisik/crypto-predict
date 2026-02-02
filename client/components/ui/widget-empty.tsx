import { Inbox } from "lucide-react";

interface WidgetEmptyProps {
	message?: string;
}

export function WidgetEmpty({
	message = "No data available",
}: WidgetEmptyProps) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
				<Inbox className="h-6 w-6" />
			</div>
			<p className="text-sm">{message}</p>
		</div>
	);
}
