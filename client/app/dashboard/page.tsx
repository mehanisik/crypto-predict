import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import MarketOverviewWidget from "@/components/widgets/market-overview";
import MachineLearningWidget from "@/components/widgets/ml-model";
import LiveChartWidget from "@/components/widgets/technical-analysis";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="grid grid-cols-2 grid-rows-2  gap-4  p-4">
            <MarketOverviewWidget />
          <div className="row-span-2 col-start-2 row-start-1">
          <MachineLearningWidget />
          </div>
          <div className="col-start-1 row-start-2">
            <LiveChartWidget />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
