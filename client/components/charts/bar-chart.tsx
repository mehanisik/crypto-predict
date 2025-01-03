"use client";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList } from "recharts";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  metrics: {
    label: "Crypto Metrics",
  },
} satisfies ChartConfig;

export function BarCharNegative() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCryptoData() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=7"
        );
        const data = await response.json();

        // Log the API response for debugging
        console.log("Raw API data:", data);

        // Transform the API data for the chart
        const formattedData = data.map(
          ([timestamp, open, high, low, close]) => {
            const date = new Date(timestamp).toISOString().split("T")[0];
            const change = ((close - open) / open) * 100; // Percentage change
            return {
              date,
              open,
              high,
              low,
              close,
              change: parseFloat(change.toFixed(2)), // Format to 2 decimal places
              volume: Math.random() * 1000, // Mock volume data
            };
          }
        );

        console.log("Formatted chart data:", formattedData);

        setChartData(formattedData);
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

  if (!chartData.length) {
    return <p>No data available. Check API or data mapping.</p>;
  }

  return (
    <Card>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  nameKey="date"
                  valueFormatter={(value, name) => `${name}: ${value}`}
                />
              }
            />
            <Bar dataKey="change">
              <LabelList position="top" dataKey="date" fillOpacity={1} />
              {chartData.map((item) => (
                <Cell
                  key={item.date}
                  fill={
                    item.change > 0
                      ? "hsl(var(--chart-1))"
                      : "hsl(var(--chart-2))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default BarCharNegative;
