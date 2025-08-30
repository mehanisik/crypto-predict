"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import MarketOverviewWidget from "../widgets/market-overview";
import LiveChartWidget from "../widgets/technical-analysis";
import MachineLearningWidget from "../widgets/ml-model";

export default function Home() {
  return (
    <div className="h-full flex flex-col overflow-hidden">


      {/* Main Dashboard Content */}
      <div className="flex-1 p-4 grid grid-rows-2 gap-4 container mx-auto h-full">
        <div className="w-full border rounded-lg h-full">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full rounded-lg"
          >
            <ResizablePanel defaultSize={60}>
              <MarketOverviewWidget />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={40}>
              <LiveChartWidget />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        
        <div className="w-full rounded-lg border h-full">
          <MachineLearningWidget />
        </div>
      </div>


    </div>
  );
}
