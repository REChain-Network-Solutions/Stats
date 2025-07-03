import { set } from "lodash";
import { IInputObject, IState } from "@/interfaces/aa.interface";

export function parseAAState(obj: IInputObject, delimiter = "."): IState {
  const state = {};
  Object.entries(obj).forEach((v) =>
    set(state, v[0].replace(delimiter, "."), v[1])
  );

  return state;
}
