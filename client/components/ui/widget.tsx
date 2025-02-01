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
}

export function Widget({ id, title, children, headerContent }: WidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Suspense fallback={<WidgetSkeleton title={title} />}>
      <div id={id ? id : "container"} className="h-full w-full">
        <div className="h-full p-4 flex flex-col">
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
          <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col">
            <DialogHeader className="h-12">
              <DialogTitle>{title}</DialogTitle>
              {headerContent}
            </DialogHeader>
            <div className="flex-1 overflow-auto">{children}</div>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  );
}
