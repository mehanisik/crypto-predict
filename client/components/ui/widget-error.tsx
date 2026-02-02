"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./button";
import { Widget } from "./widget";

interface WidgetErrorBoundaryProps {
	title: string;
	children: ReactNode;
}

interface WidgetErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class WidgetErrorBoundary extends Component<
	WidgetErrorBoundaryProps,
	WidgetErrorBoundaryState
> {
	constructor(props: WidgetErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error(`[${this.props.title}] Widget error:`, error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<Widget title={this.props.title} fullHeight>
					<div className="flex h-full flex-col items-center justify-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
							<AlertCircle className="h-6 w-6 text-destructive" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium">Failed to load widget</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Something went wrong while loading this data.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => this.setState({ hasError: false, error: null })}
						>
							<RefreshCw className="h-3.5 w-3.5 mr-1.5" />
							Retry
						</Button>
					</div>
				</Widget>
			);
		}

		return this.props.children;
	}
}
