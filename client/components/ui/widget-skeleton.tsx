import { Skeleton } from "./skeleton";
import { Widget } from "./widget";

interface WidgetSkeletonProps {
	title: string;
	children?: React.ReactNode;
}

export function WidgetSkeleton({ title, children }: WidgetSkeletonProps) {
	return (
		<Widget title={title} fullHeight>
			{children ?? <Skeleton className="h-full w-full" />}
		</Widget>
	);
}

export function TableSkeleton() {
	return (
		<div className="flex h-full flex-col overflow-hidden rounded-lg border">
			<div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-2.5">
				{Array.from({ length: 7 }).map((_, i) => (
					<Skeleton key={i} className="h-3 w-12" />
				))}
			</div>
			<div className="flex-1 divide-y">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="flex items-center gap-4 px-4 py-3">
						<Skeleton className="h-4 w-4 rounded-full" />
						<Skeleton className="h-6 w-6 rounded-full" />
						<Skeleton className="h-3 w-20" />
						<div className="ml-auto flex items-center gap-6">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="h-3 w-12" />
							<Skeleton className="h-3 w-12" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function ChartSkeleton() {
	return (
		<div className="flex h-full flex-col gap-3">
			<div className="flex items-center gap-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-7 w-12 rounded-md" />
				))}
			</div>
			<Skeleton className="flex-1 w-full rounded-md" />
		</div>
	);
}

export function FormSkeleton() {
	return (
		<div className="flex h-full flex-col gap-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className="space-y-2">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="h-9 w-full rounded-md" />
				</div>
			))}
			<Skeleton className="mt-auto h-9 w-full rounded-md" />
		</div>
	);
}
