"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@radix-ui/react-dialog";

interface PlotGridProps {
	plots: Record<string, string>;
}

export function PlotGrid({ plots }: PlotGridProps) {
	const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
	const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

	const handleImageError = (key: string) => {
		setImageErrors((prev) => new Set(prev).add(key));
	};

	if (Object.keys(plots).length === 0) {
		return (
			<div className="flex items-center justify-center h-32 text-muted-foreground">
				<div className="text-center">
					<AlertCircle className="h-8 w-8 mx-auto mb-2" />
					<p className="text-sm">No plots available</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{Object.entries(plots).map(([key, value]) => {
					const hasError = imageErrors.has(key);

					return (
						<div key={key} className="space-y-2">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-medium capitalize">
									{key.replace(/_/g, " ")}
								</h4>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSelectedPlot(value)}
									className="h-7 px-2"
								>
									<Maximize2 className="h-3 w-3 mr-1" />
									View
								</Button>
							</div>
							<div className="relative w-full h-64 rounded-lg border bg-background overflow-hidden">
								{hasError ? (
									<div className="flex items-center justify-center h-full text-muted-foreground">
										<div className="text-center">
											<AlertCircle className="h-8 w-8 mx-auto mb-2" />
											<p className="text-sm">Failed to load plot</p>
											<p className="text-xs text-muted-foreground mt-1">
												{value}
											</p>
										</div>
									</div>
								) : (
									<Image
										src={value}
										alt={key}
										fill
										className="object-contain"
										onError={() => handleImageError(key)}
										sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
									/>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<Dialog open={!!selectedPlot} onOpenChange={() => setSelectedPlot(null)}>
				<DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto">
					<DialogTitle className="sr-only">Plot Viewer</DialogTitle>
					<div className="relative w-full h-[80vh] min-h-[400px]">
						{selectedPlot && (
							<Image
								src={selectedPlot}
								alt="Full size plot"
								fill
								className="object-contain"
								sizes="95vw"
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
