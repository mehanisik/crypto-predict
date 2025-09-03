"use client";

import { Maximize2 } from "lucide-react";
import { Suspense, useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { WidgetSkeleton } from "./widget-skeleton";

interface WidgetProps {
  title: string;
  id?: string;
  children?: React.ReactNode;
  headerContent?: React.ReactNode;
  fullHeight?: boolean;
}

export function Widget({ id, title, children, headerContent, fullHeight = false }: WidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Suspense fallback={<WidgetSkeleton title={title} />}>
      <div id={id ? id : "container"} className={`${fullHeight ? "h-full" : ""} w-full`}>
        <div className={`${fullHeight ? "h-full" : ""} p-4 flex flex-col`}>
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <div className="flex gap-2 items-center">
              {headerContent}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                className="h-8 w-8"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 mt-4 overflow-hidden">{children}</div>
        </div>

        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
            <DialogHeader className="h-12">
              <DialogTitle>{title}</DialogTitle>
              {headerContent}
            </DialogHeader>
            <div className="flex-1 overflow-auto p-2">
              <div className="min-h-full">
                {children}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
