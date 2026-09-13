import { useEffect, useState } from "react";
import { partyManager, type PartyState } from "./PartyManager";

export function usePartyState(): PartyState {
  const [state, setState] = useState<PartyState>(partyManager.getState());
  useEffect(() => partyManager.subscribe(setState), []);
  return state;
}
