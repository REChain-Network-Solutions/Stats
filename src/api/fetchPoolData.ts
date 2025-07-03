import OREChain, { IExchangeRates } from "@/oREChain";
import Pool from "@/helpers/PoolHelper";
import { IState } from "@/interfaces/aa.interface";
import { IDecimals } from "@/interfaces/decimals.interface";
import { IAssetsList } from "@/interfaces/assets.interface";

export interface IPool {
  asset: string;
  asset0: string;
  asset1: string;
  swap_fee: number;
}

interface Ia2s {
  [key: string]: string;
}

interface IPoolDataReturn {
  decimals: IDecimals;
  assetToSymbol: Ia2s;
  assets: IAssetsList;
}

const baseData = {
  symbol: "GREChain",
  short: "GB",
  decimals: 9,
};

export default async function fetchPoolData(
  Client: OREChain.Client,
  factory: IState,
  a2sRegistry: IState,
  descriptionRegistry: IState,
  decimalsRegistry: IState,
  exchangeRates: IExchangeRates
): Promise<{
  assets: IAssetsList;
  decimals: IDecimals;
  assetToSymbol: Ia2s;
  pools: Pool[] | null;
}> {
  let decimals = {};
  let assetToSymbol = {};
  let assets = {};
  let pools: Pool[] | null = null;

  function initializePoolsData(): IPoolDataReturn {
    const assets: IAssetsList = { base: baseData };
    const assetToSymbol: Ia2s = a2sRegistry.a2s;
    const decimals: IDecimals = { base: assets.base.decimals };

    Object.entries<string>(descriptionRegistry.current).forEach((current) => {
      const asset = current[0].replace("desc_", "");
      decimals[asset] = parseInt(decimalsRegistry.decimals[current[1]]) || 0;
    });

    if (factory.pools) {
      Object.entries<IPool>(factory.pools).forEach((pool) => {
        if (pool[1].asset) {
          [pool[1].asset0, pool[1].asset1].forEach((asset) => {
            if (asset !== "base")
              assets[asset] = {
                symbol: a2sRegistry.a2s[asset],
                decimals: decimals[asset] || 0,
              };
          });
        }
      });
    }

    return {
      decimals,
      assetToSymbol,
      assets,
    };
  }

  async function fetchPoolsRelatedData() {
    const _pools: Pool[] = [];
    const promises: Promise<void>[] = [];
    Object.entries<IPool>(factory.pools).forEach(([address, pool]) => {
      const p = new Pool(address, [pool.asset0, pool.asset1]);
      promises.push(p.init(Client, assets, decimals));
      _pools.push(p);
    });
    await Promise.all(promises);
    pools = _pools
      .map((pool) => {
        pool.marketcap = pool.getMarketcap(assets, exchangeRates);
        return pool;
      })
      .sort((a, b) => {
        if (a.marketcap === b.marketcap) {
          return 0;
        } else if (a.marketcap > b.marketcap) {
          return -1;
        } else {
          return 1;
        }
      })
      .sort((a, b) => {
        if (a.hasLiquidity() == b.hasLiquidity()) {
          return 0;
        } else if (a.hasLiquidity() > b.hasLiquidity()) {
          return -1;
        } else {
          return 1;
        }
      });
  }

  async function updateData() {
    const poolsData = initializePoolsData();
    decimals = poolsData.decimals;
    assetToSymbol = poolsData.assetToSymbol;
    assets = poolsData.assets;
    await fetchPoolsRelatedData();
  }

  await updateData();

  return {
    decimals,
    assetToSymbol,
    assets,
    pools,
  };
}
