export interface MarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  circulatingSupply: number;
  totalVolume: number;
  marketCap: number;
  totalSupply: number;
  priceHistory: number[];
}

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  circulating_supply: number;
  total_volume: number;
  market_cap: number;
  total_supply: number | null;
  sparkline_in_7d: { price: number[] };
}
