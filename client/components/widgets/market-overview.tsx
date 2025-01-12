"use client";

import { getMarketData } from "@/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import BaseWidget from "../ui/widget";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { formatNumber, formatPercentage } from "@/lib/utils";
import SparklineChart from "../charts/sparkline-chart";

export default function MarketOverviewWidget() {
  const { data } = useQuery({
    queryKey: ["market-data"],
    queryFn: getMarketData,
  });

  return (
    <BaseWidget title="Market Overview">
      <ScrollArea className="border-t">
        <Table className="h-full">
          <TableHeader>
            <TableRow>
              <TableHead className="">#</TableHead>
              <TableHead className="">Name</TableHead>
              <TableHead className="">Price</TableHead>
              <TableHead className="">24h</TableHead>
              <TableHead className="">7d</TableHead>
              <TableHead className="">30d</TableHead>
              <TableHead className="">Market Cap</TableHead>
              <TableHead className="">Volume (24h)</TableHead>
              <TableHead className="">Total Supply</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((crypto, index) => (
              <TableRow key={crypto.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="flex items-center gap-2 whitespace-nowrap">
                  <img
                    src={crypto.image}
                    alt={crypto.name}
                    className="w-6 h-6"
                  />
                  <span>{crypto.name}</span>
                  <span className="text-muted-foreground">
                    {crypto.symbol.toUpperCase()}
                  </span>
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
                  <SparklineChart data={crypto.priceHistory} />
                  {/*${formatNumber(crypto.totalSupply)}*/}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </BaseWidget>
  );
}
