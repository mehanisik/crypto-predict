import { Card } from "@/components/ui/card";

interface SparkLineChartProps {
	data: number[];
	width?: number;
	height?: number;
}

export default function SparkLineChart({
	data,
	width = 100,
	height = 40,
}: SparkLineChartProps) {
	if (!data.length) return null;

	const min = data.reduce((acc, value) => (value < acc ? value : acc), data[0]);
	const max = data.reduce((acc, value) => (value > acc ? value : acc), data[0]);
	const range = max - min;

	const isIncreasing = data[data.length - 1] > data[0];

	const strokeColor = isIncreasing ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)";

	const points = data.map((value, index) => {
		const x = (index / (data.length - 1)) * width;
		const y = height - ((value - min) / range) * height;
		return `${x},${y}`;
	});

	return (
		<Card className="p-2">
			<svg width={width} height={height}>
				<polyline
					points={points.join(" ")}
					fill="none"
					stroke={strokeColor}
					strokeWidth={1.5}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</Card>
	);
}
