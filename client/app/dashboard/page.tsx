export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { WidgetErrorBoundary } from "@/components/ui/widget-error";
import {
	ChartSkeleton,
	FormSkeleton,
	TableSkeleton,
	WidgetSkeleton,
} from "@/components/ui/widget-skeleton";
import { MarketOverviewWidget } from "@/components/widgets/market-overview";
import MachineLearningWidget from "@/components/widgets/ml-model";
import { LiveChartWidget } from "@/components/widgets/technical-analysis";

export default function Page() {
	return (
		<div className="flex min-h-svh w-full flex-1 flex-col bg-background">
			<div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-4 p-4 flex-1 min-h-0">
				<WidgetErrorBoundary title="Market Overview">
					<Suspense
						fallback={
							<WidgetSkeleton title="Market Overview">
								<TableSkeleton />
							</WidgetSkeleton>
						}
					>
						<MarketOverviewWidget />
					</Suspense>
				</WidgetErrorBoundary>
				<div className="md:row-span-2 md:col-start-2 md:row-start-1 h-full">
					<WidgetErrorBoundary title="ML Model">
						<Suspense
							fallback={
								<WidgetSkeleton title="Machine Learning Model">
									<FormSkeleton />
								</WidgetSkeleton>
							}
						>
							<MachineLearningWidget />
						</Suspense>
					</WidgetErrorBoundary>
				</div>
				<div className="md:col-start-1 md:row-start-2 h-full">
					<WidgetErrorBoundary title="Live Chart">
						<Suspense
							fallback={
								<WidgetSkeleton title="Live Chart">
									<ChartSkeleton />
								</WidgetSkeleton>
							}
						>
							<LiveChartWidget />
						</Suspense>
					</WidgetErrorBoundary>
				</div>
			</div>
		</div>
	);
}
