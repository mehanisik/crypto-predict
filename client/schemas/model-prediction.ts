import { z } from "zod";

const predictionSchema = z.object({
	days: z.number().min(1).max(30).default(15),
	startDate: z.string().refine((date) => {
		const [year, month, day] = date.split("-").map(Number);
		if (isNaN(year) || isNaN(month) || isNaN(day)) {
			return false;
		}
		const selectedDate = new Date(year, month - 1, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return selectedDate <= today;
	}, "Start date cannot be in the future"),
});

export default predictionSchema;
