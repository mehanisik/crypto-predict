"use client";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

const NotFoundPage = () => {
	return (
		<main className="w-full h-[800px] grid place-content-center gap-2">
			<h1 className="text-center text-4xl font-bold">Not Found</h1>
			<p>The page you are looking for is not exist</p>
			<Button size="lg" className="" onClick={() => redirect("/")}>
				Click here to go dashboard
			</Button>
		</main>
	);
};

export default NotFoundPage;
