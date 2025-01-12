"use client";
import React, { useEffect, useRef, memo } from "react";
import { Badge } from "../ui/badge";
import { useTheme } from "next-themes";
import { TradingViewSymbols } from "@/constants/trading-view-symbols.constant";

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
      className="tradingview-widget-container"
      ref={container}
      style={{ height: "100%", width: "100%" }}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-background/80">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
      <div
        className="tradingview-widget-container__widget"
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      ></div>
      <Badge variant="secondary" className="text-xs">
        Chart From TradingView
      </Badge>
    </div>
  );
}

export default memo(TradingViewWidget);
