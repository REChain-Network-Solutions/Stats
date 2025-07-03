export interface ITickers {
  [key: string]: {
    market_name: string;
    quote_symbol: string;
    base_symbol: string;
    quote_id: string;
    base_id: string;
    lowest_price_24h: number;
    highest_price_24h: number;
    last_price: number;
    quote_volume: number;
    base_volume: number;
  };
}
