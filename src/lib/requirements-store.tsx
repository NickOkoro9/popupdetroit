import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { emptyRequirements, type Requirements } from "./matching/types";

export interface DnaMeta {
  source: "live_ai" | "manual";
  provider?: { name: string; model: string };
  implied: string[];
  missing: string[];
  followUps: string[];
  summary: string;
}

interface Store {
  req: Requirements;
  setReq: (r: Requirements | ((p: Requirements) => Requirements)) => void;
  dna: DnaMeta | null;
  setDna: (d: DnaMeta | null) => void;
  hydrated: boolean;
}

const Ctx = createContext<Store | null>(null);
const KEY = "popup-detroit:requirements:v1";

export function RequirementsProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<Requirements>(emptyRequirements);
  const [dna, setDna] = useState<DnaMeta | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { req: Requirements; dna: DnaMeta | null };
        setReq({ ...emptyRequirements(), ...parsed.req });
        // Normalise persisted dna: older snapshots may lack array fields added after the
        // object was first stored (e.g. missing / implied / followUps).
        if (parsed.dna) {
          setDna({
            implied: [],
            missing: [],
            followUps: [],
            ...parsed.dna,
          });
        }
      }
    } catch { /* ignore corrupt storage */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) sessionStorage.setItem(KEY, JSON.stringify({ req, dna }));
  }, [req, dna, hydrated]);

  return <Ctx.Provider value={{ req, setReq, dna, setDna, hydrated }}>{children}</Ctx.Provider>;
}

export function useRequirements() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRequirements outside provider");
  return c;
}
