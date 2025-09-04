"use client";
import React, { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";
import type { TradingViewSymbols } from "@/constants/trading-view-symbols.constant";

function TradingViewWidget({ symbol }: { symbol: TradingViewSymbols }) {
	const container = useRef<HTMLDivElement | null>(null);
	const { theme } = useTheme();

	useEffect(() => {
		if (container.current) {
			container.current.innerHTML = "";
		}

		const script = document.createElement("script");
		script.src =
			"https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
		script.type = "text/javascript";
		script.async = true;

		script.innerHTML = `
        {
          "autosize": true,
          "symbol": "${symbol}",
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "${theme === "dark" ? "dark" : "light"}",
          "style": "1",
          "locale": "en",
          "withdateranges": true,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "details": true,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        }`;
		container.current?.appendChild(script);
	}, [symbol, theme]);

	return (
		<div
			className="tradingview-widget-container absolute inset-0"
			ref={container}
		>
			<div className="tradingview-widget-container__widget h-full"></div>
		</div>
	);
}

export default memo(TradingViewWidget);
