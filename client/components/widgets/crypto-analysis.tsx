"use client";

import React, { useState } from "react";
import BaseWidget from "@/components/ui/widget";
import TradingWidget from "../charts/trading-widget";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { TradingViewSymbols } from "@/constants/trading-view-symbols.constant";

export default function CryptoAnalysisWidget() {
  const [selectedCrypto, setSelectedCrypto] = useState<TradingViewSymbols>(
    TradingViewSymbols.ETH_USDT
  );

  return (
    <BaseWidget
      title="Crypto Analysis"
      headerContent={
        <div className="flex items-end gap-2">
          <ToggleGroup
            variant="outline"
            type="single"
            defaultValue={selectedCrypto}
            onValueChange={(value: TradingViewSymbols) =>
              value && setSelectedCrypto(value)
            }
          >
            {Object.entries(TradingViewSymbols).map(([key, value]) => (
              <ToggleGroupItem key={key} value={value}>
                {key}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      }
    >
      <div className="w-full h-full">
        <TradingWidget symbol={selectedCrypto} />
      </div>
    </BaseWidget>
  );
}
