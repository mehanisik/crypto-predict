import Link from "next/link";

export default function NotFoundPage() {
	return (
		<main className="w-full h-[800px] grid place-content-center gap-2">
			<h1 className="text-center text-4xl font-bold">Not Found</h1>
			<p>The page you are looking for is not exist</p>
			<Link
				href="/"
				className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
			>
				Click here to go dashboard
			</Link>
		</main>
	);
}
