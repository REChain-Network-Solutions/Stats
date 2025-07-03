import axios from "axios";
import { API_HOST } from "../../config";

interface IKV {
  [key: string]: number;
}

export default async function fetchAPY7Days(): Promise<IKV> {
  const { data } = await axios.get(`${API_HOST}/api/v1/apy7d`);
  return data;
}
