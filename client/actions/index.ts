import { MarketData } from "@/types/crypto";

export const getMarketData = async (): Promise<MarketData[]> => {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&price_change_percentage=1h,24h,7d,30d&sparkline=true",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-CMC_PRO_API_KEY": "b7d8c1a5-d5a3-4f2c-b0b5-a2b4b6f6e2f0",
      },
    }
  );
  const data = await response.json();
  return data.map((crypto: any) => {
    return {
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
    };
  });
};
