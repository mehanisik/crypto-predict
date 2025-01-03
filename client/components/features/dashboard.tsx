"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import PricePredictionWidget from "../widgets/price-prediction";
import CryptoAnalysisWidget from "../widgets/crypto-analysis";
import MarketOverviewWidget from "../widgets/market-overview";
import NewsWidget from "../widgets/news";

export function CryptoDashboard() {
  return (
    <div className="w-full mx-auto p-4 md:h-[calc(100vh-46px)] overflow-hidden">
      {/* Mobile Layout */}
      <div className="block md:hidden space-y-6">
        <div className="h-[400px]">
          <MarketOverviewWidget />
        </div>
        <div className="h-[400px]">
          <CryptoAnalysisWidget />
        </div>

        <div className="h-[400px]">
          <PricePredictionWidget />
        </div>

        <div className="h-[400px]">
          <NewsWidget />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-2">
          {/* Left Panel Group */}
          <ResizablePanel defaultSize={50} minSize={40}>
            <div className="flex flex-col h-full gap-2">
              {/* Child widgets */}

              <div className="flex-1 flex flex-col bg-gray-100">
                <MarketOverviewWidget />
              </div>

              <div className="flex-1 flex flex-col bg-gray-200">
                <PricePredictionWidget />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel Group */}
          <ResizablePanel defaultSize={50} minSize={40}>
            <div className="flex flex-col h-full gap-2">
              <div className="flex-1 flex flex-col bg-gray-100">
                <CryptoAnalysisWidget />
              </div>

              <div className="flex-1 flex flex-col bg-gray-200">
                <NewsWidget />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default CryptoDashboard;
