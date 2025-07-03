export interface IAsset {
  symbol: string;
  short?: string;
  decimals: number;
}

export interface IAssetsList {
  [key: string]: IAsset;
}
