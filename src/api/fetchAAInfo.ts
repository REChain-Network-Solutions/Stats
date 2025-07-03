import OREChain from "@/oREChain";
import { IState } from "@/interfaces/aa.interface";

export default async function fetchAAInfo(
  Client: OREChain.Client,
  address: string
): Promise<IState> {
  const params = {
    address,
    trigger: {
      data: { info: "1" },
      address: "FAB6TH7IRAVHDLK2AAWY5YBE6CEBUACF",
      outputs: { base: 10000 },
    },
  };
  try {
    const result = await Client.api.dryRunAa(params);
    return result[0].response.responseVars;
  } catch (e) {
    return {};
  }
}
