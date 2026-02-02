import { getMarketStats } from "@/lib/actions";
import { Widget } from "../ui/widget";
import { WidgetEmpty } from "../ui/widget-empty";
import { MarketOverviewTable } from "./market-overview-table";

export async function MarketOverviewWidget() {
	const data = await getMarketStats();

	return (
		<Widget title="Market Overview" fullHeight>
			{data.length === 0 ? (
				<WidgetEmpty message="No market data available" />
			) : (
				<MarketOverviewTable data={data} />
			)}
		</Widget>
	);
}
