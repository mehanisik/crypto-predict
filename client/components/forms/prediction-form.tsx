import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "../ui/form";
import predictionSchema from "@/schemas/model-prediction";

interface PredictionFormProps {
	onSubmit: (data: z.infer<typeof predictionSchema>) => void;
	isPredicting: boolean;
}

export const PredictionForm = ({
	onSubmit,
	isPredicting,
}: PredictionFormProps) => {
	const form = useForm<z.infer<typeof predictionSchema>>({
		resolver: zodResolver(predictionSchema),
		defaultValues: {
			days: 15,
			startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0], // Yesterday's date
		},
	});

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="w-full space-y-6 sm:space-y-8"
			>
				<div className="flex flex-col gap-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="days"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Days</FormLabel>
									<FormControl>
										<Input
											type="number"
											{...field}
											className="w-full"
											min={1}
											max={365}
										/>
									</FormControl>
									<FormDescription>Number of days to predict</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="startDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Start Date</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="date"
											className="w-full"
											placeholder="YYYY-MM-DD"
											max={new Date().toISOString().split("T")[0]}
										/>
									</FormControl>
									<FormDescription>
										Starting date for prediction
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<Button type="submit" className="w-full" disabled={isPredicting}>
						{isPredicting ? "Predicting..." : "Generate Prediction"}
					</Button>
				</div>
			</form>
		</Form>
	);
};
