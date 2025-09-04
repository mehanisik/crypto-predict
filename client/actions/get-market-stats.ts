import type { CryptoData, MarketData } from "@/lib/crypto";
import axios from "axios";

export const getMarketStats = async (): Promise<MarketData[]> => {
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
};
