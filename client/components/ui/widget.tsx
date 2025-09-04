"use client";

import { Maximize2 } from "lucide-react";
import { Suspense, useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { WidgetSkeleton } from "./widget-skeleton";

interface WidgetProps {
	title: string;
	id?: string;
	children?: React.ReactNode;
	headerContent?: React.ReactNode;
	fullHeight?: boolean;
	className?: string;
	contentClassName?: string;
}

export function Widget({
	id,
	title,
	children,
	headerContent,
	fullHeight = false,
	className,
	contentClassName,
}: WidgetProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<Suspense fallback={<WidgetSkeleton title={title} />}>
			<section
				id={id ? id : "container"}
				role="region"
				aria-labelledby={id ? `${id}-title` : undefined}
				className={`${fullHeight ? "h-full" : ""} w-full rounded-md border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md focus-within:border-primary/50 focus-within:shadow-md flex flex-col ${className ?? ""}`}
			>
				<header className={`p-4 pb-0`}>
					<div className="flex items-center justify-between">
						<h2 id={id ? `${id}-title` : undefined} className="text-lg font-semibold tracking-tight">
							{title}
						</h2>
						<div className="flex items-center gap-2">
							{headerContent}
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsExpanded(true)}
								className="h-8 w-8"
								aria-label="Expand widget"
								title="Expand"
							>
								<Maximize2 className="h-4 w-4" />
								<span className="sr-only">Expand</span>
							</Button>
						</div>
					</div>
				</header>
				<div className={`flex-1 p-4 pt-3 overflow-hidden ${contentClassName ?? ""}`}>{children}</div>

				<Dialog open={isExpanded} onOpenChange={setIsExpanded}>
					<DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
						<DialogHeader className="h-12">
							<DialogTitle>{title}</DialogTitle>
							{headerContent}
						</DialogHeader>
						<div className="flex-1 overflow-auto p-2">
							<div className="min-h-full">{children}</div>
						</div>
					</DialogContent>
				</Dialog>
			</section>
		</Suspense>
	);
}
