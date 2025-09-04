"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";
import { Widget } from "../ui/widget";
import { TradingViewSymbols } from "@/constants/trading-view-symbols.constant";
import TradingViewWidget from "@/components/charts/trading-chart";
export function LiveChartWidget() {
	const [symbol, setSymbol] = useState<TradingViewSymbols>(
		TradingViewSymbols.ETH,
	);

	return (
		<Widget
			title="Technical Analysis"
			fullHeight
			headerContent={
				<ToggleGroup
					type="single"
					value={symbol}
					onValueChange={(value: TradingViewSymbols) => setSymbol(value)}
					className="shrink-0"
				>
					{Object.entries(TradingViewSymbols).map(([key, value]) => (
						<ToggleGroupItem key={key} value={value}>
							{key}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			}
		>
			<div className="relative w-full min-h-[320px] md:min-h-0 md:h-full">
				<div className="absolute inset-0">
					<TradingViewWidget symbol={symbol} />
				</div>
			</div>
		</Widget>
	);
}

export default LiveChartWidget;
