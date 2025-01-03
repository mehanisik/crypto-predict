import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";

// Enhanced data to match the pattern of your chart with more fluctuation and annotations
const data = [
  { time: "3:00 AM", value: 94290 },
  { time: "3:30 AM", value: 94320 },
  { time: "4:00 AM", value: 94150 },
  { time: "4:30 AM", value: 94410 },
  { time: "5:00 AM", value: 94530 },
  { time: "5:30 AM", value: 94480 },
  { time: "6:00 AM", value: 94620 },
  { time: "6:30 AM", value: 94730 },
  { time: "7:00 AM", value: 94780 },
  { time: "7:30 AM", value: 94850 },
  { time: "8:00 AM", value: 94670 },
  { time: "8:30 AM", value: 94510 },
  { time: "9:00 AM", value: 94320 },
  { time: "9:30 AM", value: 94460 },
  { time: "10:00 AM", value: 94740 },
  { time: "10:30 AM", value: 94920 },
  { time: "11:00 AM", value: 94880 },
  { time: "11:30 AM", value: 94910 },
  { time: "12:00 PM", value: 94950 },
  { time: "12:30 PM", value: 94890 },
  { time: "1:00 PM", value: 95020 },
  { time: "1:30 PM", value: 95070 },
  { time: "2:00 PM", value: 95030 },
  { time: "2:30 PM", value: 94910 },
  { time: "3:00 PM", value: 95100 },
  { time: "3:30 PM", value: 95120 },
  { time: "4:00 PM", value: 95110 },
  { time: "4:30 PM", value: 95080 },
  { time: "5:00 PM", value: 95040 },
  { time: "5:30 PM", value: 94920 },
  { time: "6:00 PM", value: 94820 },
  { time: "6:30 PM", value: 94970 },
  { time: "7:00 PM", value: 95040 },
  { time: "7:30 PM", value: 94910 },
  { time: "8:00 PM", value: 94970 },
  { time: "8:30 PM", value: 94990 },
  { time: "9:00 PM", value: 94870 },
  { time: "9:30 PM", value: 94890 },
].map((item, index, array) => ({
  ...item,
  prediction: item.value + Math.random() * 10,
  volume: Math.random() * 1000,
  ma20: calculateMA(array, index, 20),
  rsi: calculateRSI(array, index),
  isIncreasing: index > 0 ? item.value > array[index - 1].value : false,
}));

// Technical indicator calculations
function calculateMA(data: any[], index: number, period: number) {
  if (index < period - 1) return null;
  const sum = data
    .slice(Math.max(0, index - period + 1), index + 1)
    .reduce((acc, curr) => acc + curr.value, 0);
  return sum / period;
}

function calculateRSI(data: any[], index: number) {
  if (index < 14) return null;
  // Simplified RSI calculation
  const gains = [];
  const losses = [];
  for (let i = index - 13; i <= index; i++) {
    const change = data[i].value - data[i - 1].value;
    if (change >= 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }
  const avgGain = gains.reduce((a, b) => a + b) / 14;
  const avgLoss = losses.reduce((a, b) => a + b) / 14;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-green-500">
          Price: ${payload[0].value.toLocaleString()}
        </p>
        {payload[1] && (
          <p className="text-sm text-blue-500">
            AI Prediction: ${payload[1].value.toLocaleString()}
          </p>
        )}
        {payload[2] && (
          <p className="text-sm text-purple-500">
            MA(20): ${payload[2].value?.toLocaleString() ?? 'N/A'}
          </p>
        )}
        {payload[3] && (
          <p className="text-sm text-orange-500">
            RSI: {payload[3].value?.toFixed(2) ?? 'N/A'}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const CryptoChart = () => {
  return (
    <div className="p-6">
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" opacity={0.1} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[93750, 95150]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#colorValue)"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="prediction"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ma20"
            stroke="#a855f7"
            strokeWidth={1}
            dot={false}
          />
          <ReferenceLine
            y={94500}
            label={{ value: "Support", position: "right", fill: "#ef4444" }}
            stroke="#ef4444"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={95000}
            label={{ value: "Resistance", position: "right", fill: "#3b82f6" }}
            stroke="#3b82f6"
            strokeDasharray="3 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CryptoChart;
