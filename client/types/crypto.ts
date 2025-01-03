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
}

export enum TradingViewSymbols {
  BTC_USDT = "BINANCE:BTCUSDT",
  ETH_USDT = "BINANCE:ETHUSDT",
  DOGE_USDT = "BINANCE:DOGEUSDT",
  XRP_USDT = "BINANCE:XRPUSDT",
  SOL_USDT = "BINANCE:SOLUSDT",
}
