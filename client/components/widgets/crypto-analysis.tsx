"use client";

import React from "react";
import BaseWidget from "@/components/ui/widget";
import TradingWidget from "../charts/trading-widget";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export default function CryptoAnalysisWidget() {
  return (
    <BaseWidget
      title="Crypto Analysis"
      headerContent={
        <div className="flex items-end gap-2">
          <ToggleGroup variant="outline" type="single" defaultValue="btc">
            <ToggleGroupItem value="btc">BTC</ToggleGroupItem>
            <ToggleGroupItem value="eth">ETH</ToggleGroupItem>
            <ToggleGroupItem value="doge">DOGE</ToggleGroupItem>
            <ToggleGroupItem value="xrp">XRP</ToggleGroupItem>
            <ToggleGroupItem value="sol">SOL</ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    >
      <div className="w-full h-[350px]">
        <TradingWidget />
      </div>
    </BaseWidget>
  );
}
