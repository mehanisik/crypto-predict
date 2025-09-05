import axios from "axios";
import type { CryptoData, MarketData } from "@/lib/crypto";
import { unstable_cache as cache } from "next/cache";
import server, { API_ENDPOINTS } from "@/lib/axios";
import type {
	StartTrainingPayload,
	StartTrainingResponse,
	PredictionPayload,
	PredictionResponse,
} from "@/types/ml-model";

export const getMarketStats = cache(async (): Promise<MarketData[]> => {
	try {
		const { data } = await axios.get(`${process.env.NEXT_PUBLIC_CRYPTO_URL}`, {
			params: {
				vs_currency: "usd",
				order: "market_cap_desc",
				per_page: 10,
				page: 1,
				price_change_percentage: "1h,24h,7d,30d",
				sparkline: true,
			},
		});

		return data.map((crypto: CryptoData) => ({
			id: crypto.id,
			symbol: crypto.symbol,
			name: crypto.name,
			image: crypto.image,
			price: crypto.current_price,
			change24h: crypto.price_change_percentage_24h_in_currency,
			change7d: crypto.price_change_percentage_7d_in_currency,
			change30d: crypto.price_change_percentage_30d_in_currency,
			circulatingSupply: crypto.circulating_supply,
			totalVolume: crypto.total_volume,
			marketCap: crypto.market_cap,
			totalSupply: crypto.total_supply,
			priceHistory: crypto.sparkline_in_7d.price,
		}));
	} catch (_error) {
		return [];
	}
});

export async function startTraining(
	payload: StartTrainingPayload,
): Promise<StartTrainingResponse> {
	const res = await server.post(API_ENDPOINTS.TRAINING, payload);
	return res.data as StartTrainingResponse;
}

export async function makePrediction(
	payload: PredictionPayload,
): Promise<PredictionResponse> {
	const res = await server.post(API_ENDPOINTS.PREDICT, payload);
	return res.data as PredictionResponse;
}
