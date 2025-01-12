import React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import PricePredictionWidget from "../widgets/price-prediction";
import CryptoAnalysisWidget from "../widgets/crypto-analysis";
import MarketOverviewWidget from "../widgets/market-overview";

export function CryptoDashboard() {
  return (
    <div className="container mx-auto flex-1 mt-4 h-[100vh-45px]">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-[400px] mb-4 rounded-lg border"
      >
        <ResizablePanel defaultSize={60} minSize={30}>
          <MarketOverviewWidget />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} minSize={30}>
          <CryptoAnalysisWidget />
        </ResizablePanel>
      </ResizablePanelGroup>
      <div className="h-[400px] rounded-lg border">
        <PricePredictionWidget />
      </div>
    </div>
  );
}
export default CryptoDashboard;
