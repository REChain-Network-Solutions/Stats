import axios from "axios";
import { API_HOST } from "../../config";

interface IKV {
  [key: string]: number;
}

export default async function fetchExchangeRates(): Promise<IKV> {
  const { data } = await axios.get(`${API_HOST}/api/v1/exchangeRates`);
  return data;
}
