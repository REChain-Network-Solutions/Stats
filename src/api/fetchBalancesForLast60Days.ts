import axios from "axios";
import { API_HOST } from "../../config";

export default async function fetchBalancesForLast60Days(
  address: string
): Promise<any[]> {
  const date = new Date();
  const end = date.toISOString();
  date.setDate(date.getDate() - 60);
  const start = date.toISOString();
  const { data } = await axios.get(
    `${API_HOST}/api/v1/balances/${address}?period=daily&start=${start}&end=${end}`
  );
  return data;
}
