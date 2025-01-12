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
