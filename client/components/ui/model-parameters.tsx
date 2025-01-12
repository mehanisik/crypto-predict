import React from "react";
import { Button } from "./button";
import { Input } from "./input";
import { RefreshCcw } from "lucide-react";

export interface ModelParams {
  ticker_symbol: string;
  start_date: string;
  end_date: string;
}

const ModelParameters: React.FC<{
  params: ModelParams;
  onChange: (key: keyof ModelParams, value: string | number) => void;
  onSubmit: () => void;
  isLoading: boolean;
}> = ({ params, onChange, onSubmit, isLoading }) => (
  <div className="flex items-center gap-2">
    <Input
      id="ticker_symbol"
      value={params.ticker_symbol}
      placeholder="Symbol (e.g. ETH-USD)"
      onChange={(e) => onChange("ticker_symbol", e.target.value)}
    />
    <Input
      type="date"
      id="start_date"
      value={params.start_date}
      onChange={(e) => onChange("start_date", e.target.value)}
    />
    <Input
      type="date"
      id="end_date"
      value={params.end_date}
      onChange={(e) => onChange("end_date", e.target.value)}
    />
    <Button onClick={onSubmit} disabled={isLoading}>
      {isLoading ? (
        <>
          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
          Initializing Model
        </>
      ) : (
        "Start Training"
      )}
    </Button>
  </div>
);

export { ModelParameters };
