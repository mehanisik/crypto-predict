import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "CryptoPredict - AI-Powered Crypto Predictions",
	description:
		"CryptoPredict is a platform that uses machine learning to predict the prices of cryptocurrencies like Solana, Ethereum.",
	keywords: [
		"cryptocurrency",
		"crypto",
		"bitcoin",
		"ethereum",
		"prediction",
		"machine learning",
		"ai",
		"artificial intelligence",
	],
	icons: {
		icon: "/favicon.ico",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"min-h-screen bg-background font-sans antialiased flex flex-col h-screen",
					inter.className,
				)}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<QueryProvider>
						{children}
						<SpeedInsights sampleRate={0.5} />
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
