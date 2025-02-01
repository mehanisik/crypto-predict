"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@radix-ui/react-dialog";

interface PlotGridProps {
  plots: Record<string, string>;
}

export function PlotGrid({ plots }: PlotGridProps) {
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-full">
        {Object.entries(plots).map(([key, value]) => (
          <div
            key={key}
            className="group relative aspect-square rounded-lg overflow-hidden border bg-background"
          >
            <Image
              src={`data:image/png;base64,${value}`}
              alt={key}
              layout="fill"
              objectFit="cover"
              className="transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedPlot(value)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedPlot} onOpenChange={() => setSelectedPlot(null)}>
        <DialogContent className="max-w-[90vw] w-auto max-h-[90vh]">
          <DialogTitle></DialogTitle>
          <div className="relative">
            {selectedPlot && (
              <Image
                src={`data:image/png;base64,${selectedPlot}`}
                alt="Full size plot"
                layout="responsive"
                width={800}
                height={600}
                className="object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
