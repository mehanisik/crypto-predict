import { PlotData } from "@/types/plot";

const transformPlotData = (plotlyData: any): PlotData => {
  const firstTrace = plotlyData.data[0];
  return {
    type: "line",
    data: firstTrace.x.map((x: any, i: number) => ({
      x,
      y: firstTrace.y[i],
    })),
    series: [
      {
        name: firstTrace.name || "Value",
        key: "y",
        color: "#2563eb",
      },
    ],
    xAxis: {
      key: "x",
      label: plotlyData.layout?.xaxis?.title || "X",
    },
    yAxis: {
      label: plotlyData.layout?.yaxis?.title || "Y",
    },
  };
};

export { transformPlotData };
