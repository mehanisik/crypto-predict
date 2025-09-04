"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import SparkLineChart from "../charts/sparkline-chart";
import Image from "next/image";
import { Widget } from "../ui/widget";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { useMarketStats } from "@/hooks/use-market-queries";

export default function MarketOverviewWidget() {
	const { data } = useMarketStats();

	return (
		<Widget title="Market Overview">
			<div className="max-h-[35vh] flex flex-col overflow-hidden">
				<div className="flex-1 overflow-auto rounded-lg border">
					<Table className="h-full">
						<TableHeader className="sticky top-0 bg-background z-10">
							<TableRow>
								<TableHead>#</TableHead>
								<TableHead className="">Name</TableHead>
								<TableHead className="text-right">Price</TableHead>
								<TableHead className="text-right">24h</TableHead>
								<TableHead className="text-right">7d</TableHead>
								<TableHead className="text-right">30d</TableHead>
								<TableHead className="text-right">Cap</TableHead>
								<TableHead className="text-right">Volume</TableHead>
								<TableHead className="text-right">Change</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="overflow-auto">
							{data?.map((crypto, index) => (
								<TableRow key={crypto.id}>
									<TableCell>{index + 1}</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center gap-2">
											<Image
												src={crypto.image}
												alt={crypto.name}
												width={24}
												height={24}
											/>
											<span>{crypto.name}</span>
											<span className="text-muted-foreground">
												{crypto.symbol.toUpperCase()}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-right">
										${formatNumber(crypto.price)}
									</TableCell>
									<TableCell
										className={`text-right ${
											crypto.change24h >= 0 ? "text-green-500" : "text-red-500"
										}`}
									>
										<span className="flex items-center gap-1 justify-end">
											{crypto.change24h >= 0 ? (
												<ChevronUp className="w-4 h-4" />
											) : (
												<ChevronDown className="w-4 h-4" />
											)}
											{formatPercentage(crypto.change24h)}%
										</span>
									</TableCell>
									<TableCell
										className={`text-right ${
											crypto.change7d >= 0 ? "text-green-500" : "text-red-500"
										}`}
									>
										<span className="flex items-center gap-1 justify-end">
											{crypto.change7d >= 0 ? (
												<ChevronUp className="w-4 h-4" />
											) : (
												<ChevronDown className="w-4 h-4" />
											)}
											{formatPercentage(crypto.change7d)}%
										</span>
									</TableCell>
									<TableCell
										className={`text-right ${
											crypto.change30d >= 0 ? "text-green-500" : "text-red-500"
										}`}
									>
										<span className="flex items-center gap-1 justify-end">
											{crypto.change30d >= 0 ? (
												<ChevronUp className="w-4 h-4" />
											) : (
												<ChevronDown className="w-4 h-4" />
											)}
											{formatPercentage(crypto.change30d)}%
										</span>
									</TableCell>
									<TableCell className="text-right">
										${formatNumber(crypto.marketCap)}
									</TableCell>
									<TableCell className="text-right">
										${formatNumber(crypto.totalVolume)}
									</TableCell>
									<TableCell className="text-right">
										<SparkLineChart data={crypto.priceHistory} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</Widget>
	);
}
