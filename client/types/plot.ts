export interface PlotData {
  type: "line" | "area";
  data: Array<Record<string, any>>;
  series: Array<{
    name: string;
    key: string;
    color: string;
  }>;
  xAxis: {
    key: string;
    label: string;
  };
  yAxis: {
    label: string;
  };
}
