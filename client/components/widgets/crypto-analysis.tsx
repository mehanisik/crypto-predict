"use client";

import React, { useState } from "react";
import BaseWidget from "@/components/ui/widget";
import TradingWidget from "../charts/trading-widget";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export default function CryptoAnalysisWidget() {
  const [selectedCrypto, setSelectedCrypto] = useState<
    "BTCUSDT" | "ETHUSDT" | "DOGEUSDT" | "XRPUSDT" | "SOLUSDT"
  >("BTCUSDT");


  return (
    <BaseWidget
      title="Crypto Analysis"
      headerContent={
        <div className="flex items-end gap-2">
          <ToggleGroup
            variant="outline"
            type="single"
            defaultValue="BTCUSDT"
            onValueChange={(value) =>
              value && setSelectedCrypto(value as typeof selectedCrypto)
            }
          >
            <ToggleGroupItem value="BTCUSDT">BTC</ToggleGroupItem>
            <ToggleGroupItem value="ETHUSDT">ETH</ToggleGroupItem>
            <ToggleGroupItem value="DOGEUSDT">DOGE</ToggleGroupItem>
            <ToggleGroupItem value="XRPUSDT">XRP</ToggleGroupItem>
            <ToggleGroupItem value="SOLUSDT">SOL</ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    >
      <div className="w-full h-[350px]">
        <TradingWidget symbol={selectedCrypto} />
      </div>
    </BaseWidget>
  );
}
