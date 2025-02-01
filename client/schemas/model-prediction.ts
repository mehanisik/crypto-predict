import { z } from "zod";

const predictionSchema = z.object({
  days: z.number().min(1).max(30).default(15),
  startDate: z.string().refine((date) => {
    const [year, month, day] = date.split("-").map(Number);
    return !isNaN(year) && !isNaN(month) && !isNaN(day);
  }),
});

export default predictionSchema;
