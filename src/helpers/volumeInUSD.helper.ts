import { Ref } from "vue";
import { ICandles } from "@/interfaces/candles.inerface";
import { IExchangeRates } from "@/oREChain";

export function getVolumeInUSDHelper(
  asset0: string,
  asset1: string,
  candle: ICandles,
  exchangeRates: Ref<IExchangeRates>
): number {
  if (exchangeRates.value[`${asset1}_USD`]) {
    const price = 1 / candle.close_price;
    const volume = price * candle.quote_volume;
    return Number((exchangeRates.value[`${asset1}_USD`] * volume).toFixed(2));
  } else if (exchangeRates.value[`${asset0}_USD`]) {
    const volume = candle.close_price * candle.base_volume;
    return Number((exchangeRates.value[`${asset0}_USD`] * volume).toFixed(2));
  }
  return 0;
}
