import { z } from "zod";

const trainingSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[a-zA-Z0-9-]+$/, {
      message: "Ticker must contain only letters, numbers, or hyphens",
    }),
  modelType: z.enum(["CNN", "LSTM", "CNN-LSTM", "LSTM-CNN"]),
  startDate: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: "Invalid date",
  }),
  endDate: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: "Invalid date",
  }),
  lookback: z.number().min(1).max(60).default(8),
  epochs: z.number().min(1).max(1000).default(100),
  batchSize: z.number().min(1).max(1000).default(32),
});

export default trainingSchema;
