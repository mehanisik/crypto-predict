import { MarketOverviewWidget } from "@/components/widgets/market-overview";
import MachineLearningWidget from "@/components/widgets/ml-model";
import { LiveChartWidget } from "@/components/widgets/technical-analysis";
export default function Page() {
	return (
		<div className="flex min-h-svh w-full flex-1 flex-col bg-background">
			<div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-[auto,1fr] gap-4 p-4 flex-1 min-h-0">
				<MarketOverviewWidget />
				<div className="md:row-span-2 md:col-start-2 md:row-start-1 h-full">
					<MachineLearningWidget />
				</div>
				<div className="md:col-start-1 md:row-start-2">
					<LiveChartWidget />
				</div>
			</div>
		</div>
	);
}
