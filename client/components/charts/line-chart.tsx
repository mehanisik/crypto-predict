"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  views: {
    label: "Crypto Prices",
  },
  price: {
    label: "Price (USD)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function LineChartInteractive() {
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchCryptoData() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30"
        );
        const data = await response.json();
        const formattedData = data.prices.map(
          ([timestamp, price], index, arr) => {
            const prevPrice = index > 0 ? arr[index - 1][1] : price;
            return {
              date: new Date(timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              price: parseFloat(price.toFixed(2)),
              isIncreasing: price >= prevPrice,
            };
          }
        );
        setChartData(formattedData);
        console.log("Formatted Data:", formattedData);
      } catch (error) {
        console.error("Error fetching crypto data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCryptoData();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Card>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 50,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="price"
                  labelFormatter={(value) => value}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="none"
              fill="url(#colorGradient)"
            />
            <Line
              type="monotone"
              dataKey="price"
              strokeWidth={3}
              dot={false}
              stroke={(data) => (data.isIncreasing ? "#22c55e" : "#ef4444")}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default LineChartInteractive;
