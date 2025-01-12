import React, { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlotData } from "@/types/plot";

const ChartComponent: React.FC<{ plot: PlotData }> = ({ plot }) => {
  const ChartType = plot.type === "line" ? LineChart : AreaChart;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ChartType
        data={plot.data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={plot.xAxis.key}
          label={{
            value: plot.xAxis.label,
            position: "bottom",
          }}
        />
        <YAxis
          label={{
            value: plot.yAxis.label,
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip />
        <Legend />
        {plot.series.map((series) =>
          plot.type === "line" ? (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.name}
              stroke={series.color}
              dot={false}
            />
          ) : (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.name}
              stroke={series.color}
              fill={series.color}
              fillOpacity={0.3}
            />
          )
        )}
      </ChartType>
    </ResponsiveContainer>
  );
};

export default memo(ChartComponent);
