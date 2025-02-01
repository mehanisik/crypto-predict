export interface VisualizingUpdateResponse {
  type: "visualizing_update";
  data: {
    current_plot: string;
    total_plots: number;
    progress: number;
    plots: {
      [key: string]: string;
    };
  };
  timestamp: string;
}
