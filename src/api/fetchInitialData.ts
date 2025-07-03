import fetchAAStateVars from "@/api/fetchAAStateVars";
import OREChain from "@/oREChain";
import { IState } from "@/interfaces/aa.interface";

export default async function fetchInitialData(Client: OREChain.Client): Promise<{
  factory: IState;
  a2sRegistry: IState;
  descriptionRegistry: IState;
  decimalsRegistry: IState;
}> {
  const factory = await fetchAAStateVars(
    Client,
    "B22543LKSS35Z55ROU4GDN26RT6MDKWU"
  );
  const a2sRegistry = await fetchAAStateVars(
    Client,
    "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ",
    "a2s_",
    "_"
  );
  const descriptionRegistry = await fetchAAStateVars(
    Client,
    "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ",
    "current_desc_",
    "_"
  );
  const decimalsRegistry = await fetchAAStateVars(
    Client,
    "O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ",
    "decimals_",
    "_"
  );

  return {
    factory,
    a2sRegistry,
    descriptionRegistry,
    decimalsRegistry,
  };
}
