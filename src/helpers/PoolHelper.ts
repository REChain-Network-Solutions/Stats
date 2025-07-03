import fetchAAInfo from "@/api/fetchAAInfo";
import OREChain from "@/oREChain";
import { IAssetsList, IAsset } from "@/interfaces/assets.interface";
import { IDecimals } from "@/interfaces/decimals.interface";
import { ITickers } from "@/interfaces/tickers.interface";
import { ICandles } from "@/interfaces/candles.inerface";

interface IExchangeRates {
  [key: string]: number;
}

function getAmountBought(
  inputAmount: number,
  inputReserve: number,
  outputReserve: number,
  swapFee: number
): number {
  const swapNoFee = 1e11 - swapFee;
  const numerator = inputAmount * outputReserve * swapNoFee;
  const denominator = inputReserve * 1e11 + inputAmount * swapNoFee;
  return Math.floor(numerator / denominator);
}

function getAmountSold(
  outputAmount: number,
  outputReserve: number,
  inputReserve: number,
  swapFee: number
): number {
  const swapNoFee = 1e11 - swapFee;
  const numerator = outputAmount * inputReserve * 1e11;
  const denominator = (outputReserve - outputAmount) * swapNoFee;
  return Math.ceil(numerator / denominator);
}

export default class Pool {
  ready = false;
  address = "";
  asset0 = "";
  asset0_decimals = 0;
  asset1 = "";
  asset1_decimals = 0;
  swapFee = 0;
  asset = "";
  asset_decimals = 0;
  ticker = "";
  tickerForApi = "";
  reserve0 = 0;
  reserve1 = 0;
  supply = 0;
  base = 0;
  marketcap = 0;
  history: any;

  constructor(address: string, assets: string[]) {
    this.asset0 = assets[0];
    this.asset1 = assets[1];
    this.address = address;
  }

  async init(
    Client: OREChain.Client,
    assets: IAssetsList,
    decimals: IDecimals
  ): Promise<void> {
    const info = await fetchAAInfo(Client, this.address);
    this.swapFee = Math.floor(parseFloat(info.swap_fee));
    this.asset = info.asset;
    this.reserve0 = Math.floor(parseFloat(info.reserve0));
    this.reserve1 = Math.floor(parseFloat(info.reserve1));
    this.supply = Math.floor(parseFloat(info.supply));
    if (info.asset0 === "base") this.base = info.reserve0;
    if (info.asset1 === "base") this.base = info.reserve1;
    const poolName = `${this.asset0}_${this.asset1}`;
    this.ticker = this.getTicker(poolName, assets);
    this.tickerForApi = this.getTickerForAPI(assets);

    this.setAssetsDecimals(decimals);
    this.ready = true;
  }

  setAssetsDecimals(decimals: IDecimals): void {
    this.asset0_decimals = decimals[this.asset0];
    this.asset_decimals = decimals[this.asset];
    this.asset1_decimals = decimals[this.asset1];
  }

  shorten(asset: string): string {
    if (asset.length < 10) return asset;
    return `${asset.slice(0, 4)}...${asset.slice(asset.length - 4)}`;
  }

  getTicker(poolName: string, assets: IAssetsList): string {
    if (!poolName) return "";
    let ticker = "";

    poolName.split("_").forEach((asset, i) => {
      ticker +=
        assets[asset] && assets[asset].symbol
          ? assets[asset].symbol
          : this.shorten(asset);
      if (poolName.split("_").length === 2 && i === 0) ticker += "-";
    });

    return ticker;
  }

  getTickerForAPI(assets: IAssetsList): string {
    if (!assets) return "";
    return this.getTicker(`${this.asset1}_${this.asset0}`, assets);
  }

  hasLiquidity(): boolean {
    return !(!this.reserve0 || !this.reserve1 || !this.supply);
  }

  getAmountBought(inputAmount: number, inputAsset: string): number {
    const inputReserve =
      inputAsset === this.asset0 ? this.reserve0 : this.reserve1;
    const outputReserve =
      inputAsset === this.asset1 ? this.reserve0 : this.reserve1;
    return getAmountBought(
      inputAmount,
      inputReserve,
      outputReserve,
      this.swapFee
    );
  }

  getAmountSold(outputAmount: number, outputAsset: string): number {
    const inputReserve =
      outputAsset === this.asset1 ? this.reserve0 : this.reserve1;
    const outputReserve =
      outputAsset === this.asset0 ? this.reserve0 : this.reserve1;
    return getAmountSold(
      outputAmount,
      outputReserve,
      inputReserve,
      this.swapFee
    );
  }

  assetValue(value: number, asset: IAsset): number {
    const decimals = asset ? asset.decimals : 0;
    return value / 10 ** decimals;
  }

  getPrice(assetId: string, assets: IAssetsList): number {
    const asset = assets[assetId];
    const decimals = asset ? asset.decimals : 0;
    if (this.asset0 == assetId) {
      return (this.reserve1 / this.reserve0) * 10 ** decimals;
    } else if (this.asset1 == assetId) {
      return (this.reserve0 / this.reserve1) * 10 ** decimals;
    }
    return 0;
  }

  getSymbol(assetId: string, assets: IAssetsList): string {
    return assets[assetId].symbol;
  }

  getFormattedPrice(
    assetId: string,
    decimals: number,
    assets: IAssetsList
  ): number {
    const amount = this.getPrice(assetId, assets);
    const multiplier = 10 ** decimals;
    const nmbr = parseFloat((amount / multiplier).toFixed(decimals));
    return isNaN(nmbr) || nmbr < 0 ? 0 : nmbr;
  }

  getMarketcap(assets: IAssetsList, exchangeRates: IExchangeRates): number {
    let assetValue0 = 0;
    let assetValue1 = 0;
    if (this.base) {
      assetValue0 = assetValue1 = (exchangeRates.GREChain_USD / 1e9) * this.base;
    } else {
      const assetId0 = this.asset0 === "base" ? "GREChain" : this.asset0;
      const assetId1 = this.asset1 === "base" ? "GREChain" : this.asset1;
      const asset0 = assets[assetId0];
      const asset1 = assets[assetId1];
      assetValue0 = exchangeRates[`${assetId0}_USD`]
        ? exchangeRates[`${assetId0}_USD`] *
          this.assetValue(this.reserve0, asset0)
        : 0;
      assetValue1 = exchangeRates[`${assetId1}_USD`]
        ? exchangeRates[`${assetId1}_USD`] *
          this.assetValue(this.reserve1, asset1)
        : 0;
    }
    return assetValue0 && assetValue1 ? assetValue0 + assetValue1 : 0;
  }

  getPricesByBalances(balances: any, assets: IAssetsList): [number, number] {
    function format(amount: number, decimals: number): number {
      const multiplier = 10 ** decimals;
      const nmbr = parseFloat((amount / multiplier).toFixed(decimals));
      return isNaN(nmbr) || nmbr < 0 ? 0 : nmbr;
    }

    const asset0 = this.asset0 === "base" ? "GREChain" : this.asset0;
    const asset1 = this.asset1 === "base" ? "GREChain" : this.asset1;
    const assetInfo0 = assets[this.asset0];
    const assetInfo1 = assets[this.asset1];
    const decimals0 = assetInfo0 ? assetInfo0.decimals : 0;
    const decimals1 = assetInfo1 ? assetInfo1.decimals : 0;
    const balance0 = (balances[asset1] / balances[asset0]) * 10 ** decimals0;
    const balance1 = (balances[asset0] / balances[asset1]) * 10 ** decimals1;
    return [format(balance0, decimals1), format(balance1, decimals0)];
  }

  getMarketcapByBalances(
    balances: any,
    assets: IAssetsList,
    exchangeRates: IExchangeRates
  ): number {
    let assetValue0 = 0;
    let assetValue1 = 0;
    if (this.base) {
      assetValue0 = assetValue1 =
        (exchangeRates.GREChain_USD / 1e9) * balances["GREChain"];
    } else {
      const assetId0 = this.asset0 === "base" ? "GREChain" : this.asset0;
      const assetId1 = this.asset1 === "base" ? "GREChain" : this.asset1;
      const asset0 = assets[assetId0];
      const asset1 = assets[assetId1];
      assetValue0 = exchangeRates[`${assetId0}_USD`]
        ? exchangeRates[`${assetId0}_USD`] *
          this.assetValue(balances[assetId0], asset0)
        : 0;
      assetValue1 = exchangeRates[`${assetId1}_USD`]
        ? exchangeRates[`${assetId1}_USD`] *
          this.assetValue(balances[assetId1], asset1)
        : 0;
    }
    return assetValue0 && assetValue1 ? assetValue0 + assetValue1 : 0;
  }

  get24hVolumeInUSD(
    tickers: ITickers,
    assets: IAssetsList,
    exchangeRates: IExchangeRates,
    address: string
  ): number {
    const ticker = tickers[address + "-" + this.getTickerForAPI(assets)];
    if (!ticker) return 0;

    let volumeInUSD = 0;
    const assetId0 = ticker.base_id === "base" ? "GREChain" : ticker.base_id;
    const assetId1 = ticker.quote_id === "base" ? "GREChain" : ticker.quote_id;
    if (exchangeRates[`${assetId0}_USD`]) {
      volumeInUSD = exchangeRates[`${assetId0}_USD`] * ticker.base_volume;
    } else if (exchangeRates[`${assetId1}_USD`]) {
      volumeInUSD = exchangeRates[`${assetId1}_USD`] * ticker.quote_volume;
    }

    return Number(volumeInUSD.toFixed(2));
  }

  getAPY7d(candles: ICandles[], exchangeRates: IExchangeRates): number {
    const l = candles.length;
    if (l < 7) return 0;
    const candlesLast7d = candles.slice(l - 8, l - 1);
    const fee = this.swapFee / 10 ** 11;
    let asset = this.asset0 === "base" ? "GREChain" : this.asset0;
    let type = "quote";
    let rate = exchangeRates[`${asset}_USD`];
    if (!rate) {
      asset = this.asset1 === "base" ? "GREChain" : this.asset1;
      type = "base";
      rate = exchangeRates[`${asset}_USD`];
    }
    const earning7d = candlesLast7d
      .map((c: ICandles) => {
        const volume = type === "quote" ? c.quote_volume : c.base_volume;
        const inUSD = volume * rate;
        return inUSD * fee;
      })
      .reduce((prev, curr) => prev + curr, 0);

    console.log("e", earning7d, this.marketcap);
    const apy = (1 + earning7d / this.marketcap) ** (365 / 7) - 1;

    return Number((apy * 100).toFixed(2)) || 0;
  }
}
