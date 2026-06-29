import { createInitialDemoStore, DEMO_VENTES } from "./data";

const STORAGE_KEY = "gestion-parc-auto-demo";
const SCHEMA_VERSION = 2;

export type DemoStore = ReturnType<typeof createInitialDemoStore>;

function normalizeDemoStore(raw: unknown): DemoStore {
  const initial = createInitialDemoStore();

  if (!raw || typeof raw !== "object") {
    return initial;
  }

  const data = raw as Partial<DemoStore> & { _schemaVersion?: number };

  if (!Array.isArray(data.voitures) || data.voitures.length === 0) {
    return initial;
  }

  const ventes = Array.isArray(data.ventes)
    ? data.ventes.map((vente) => ({
        ...vente,
        status: vente.status ?? ("active" as const),
        cancelled_at: vente.cancelled_at ?? null,
        cancelled_by: vente.cancelled_by ?? null,
        cancel_reason: vente.cancel_reason ?? null,
        cancelled_from_module: vente.cancelled_from_module ?? null,
      }))
    : initial.ventes;

  const store: DemoStore = {
    _schemaVersion: SCHEMA_VERSION,
    voitures: data.voitures,
    ventes: ventes.length > 0 ? ventes : initial.ventes,
    paiements_vente: Array.isArray(data.paiements_vente) ? data.paiements_vente : [],
    parametres: { ...initial.parametres, ...data.parametres },
  };

  if (data._schemaVersion !== SCHEMA_VERSION) {
    const demoVenteIds = new Set(DEMO_VENTES.map((v) => v.id));
    const customVentes = store.ventes.filter((v) => !demoVenteIds.has(v.id));
    store.ventes = [...structuredClone(DEMO_VENTES), ...customVentes];
    saveDemoStore(store);
  }

  return store;
}

export function loadDemoStore(): DemoStore {
  if (typeof window === "undefined") {
    return createInitialDemoStore();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDemoStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return normalizeDemoStore(JSON.parse(raw));
  } catch {
    const initial = createInitialDemoStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

export function saveDemoStore(store: DemoStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...store, _schemaVersion: SCHEMA_VERSION })
  );
}

export function resetDemoStore() {
  const initial = createInitialDemoStore();
  saveDemoStore(initial);
  return initial;
}
