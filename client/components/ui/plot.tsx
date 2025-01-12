import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { PlotData } from "@/types/plot";
import ChartComponent from "@/components/charts/chart";

const PlotCard: React.FC<{ title: string; plot: PlotData }> = ({
  title,
  plot,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <ChartComponent plot={plot} />
    </CardContent>
  </Card>
);

export default memo(PlotCard);
