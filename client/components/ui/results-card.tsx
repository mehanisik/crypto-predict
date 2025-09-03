import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PredictionResponse } from "@/lib/api";

interface ResultsCardProps {
  predictions?: PredictionResponse;
}

export function ResultsCard({ predictions }: ResultsCardProps) {
  if (!predictions?.data?.predictions?.length) return null;

  const { model_config, predictions: forecast, data_range } = predictions.data;
  const firstPrice = forecast[0].predicted_price;
  const lastPrice = forecast[forecast.length - 1].predicted_price;
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  const chartData = forecast.map((prediction) => ({
    day: prediction.day,
    price: prediction.predicted_price,
    lower: prediction.lower_bound,
    upper: prediction.upper_bound,
  }));

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {model_config.ticker} Forecast
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {forecast.length}-Day Prediction
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {formatNumber(lastPrice ?? 0)}
            </div>
            <div
              className={`flex items-center text-sm ${
                priceChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {priceChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {Math.abs(priceChange).toFixed(2)}%
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Confidence</span>
              <span>±{formatNumber(forecast[0]?.confidence_interval)}</span>
            </div>
            <Progress
              value={(1 - forecast[0]?.confidence_interval / firstPrice) * 100}
              className="h-2 w-[120px]"
            />
          </div>
        </div>

        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={1.5}
                dot={false}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                content={({ payload }) => (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="text-sm font-semibold">
                      {formatNumber(payload?.[0]?.payload?.price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Day {payload?.[0]?.payload?.day}
                      <div className="mt-1">
                        <span className="text-red-500">
                          ↓ {formatNumber(payload?.[0]?.payload?.lower)}
                        </span>
                        <span className="mx-1">|</span>
                        <span className="text-green-500">
                          ↑ {formatNumber(payload?.[0]?.payload?.upper)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Model Metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Model</span>
            <span className="font-medium">{model_config.model}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Lookback</span>
            <span className="font-medium">{model_config.lookback}d</span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            Training Data:{" "}
            {new Date(
              data_range?.start_date || new Date()
            ).toLocaleDateString()}{" "}
            -{" "}
            {new Date(data_range?.end_date || new Date()).toLocaleDateString()}
          </p>
          <p>
            Predictions Start:{" "}
            {new Date(
              data_range?.prediction_start || new Date()
            ).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
