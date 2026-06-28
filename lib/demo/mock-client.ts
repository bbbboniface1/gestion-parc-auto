import { annulerVenteDemo } from "./ventes";
import { computeDashboardStats } from "./stats";
import { loadDemoStore, saveDemoStore } from "./storage";

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: { message: string } | null; count?: number };

function uuid() {
  return crypto.randomUUID();
}

class DemoQueryBuilder {
  private table: string;
  private filters: Array<(row: Row) => boolean> = [];
  private orderField?: string;
  private orderAsc = true;
  private limitCount?: number;
  private selectFields = "*";
  private countOnly = false;
  private likeFilter?: { field: string; pattern: string };
  private isSingle = false;
  private pendingInsert?: Row;
  private pendingUpdate?: Row;
  private pendingDelete = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selectFields = fields;
    if (options?.count === "exact" && options?.head) {
      this.countOnly = true;
    }
    return this;
  }

  insert(payload: Row | Row[]) {
    this.pendingInsert = Array.isArray(payload) ? payload[0] : payload;
    return this;
  }

  update(payload: Row) {
    this.pendingUpdate = payload;
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  gte(field: string, value: unknown) {
    this.filters.push((row) => String(row[field] ?? "") >= String(value));
    return this;
  }

  like(field: string, pattern: string) {
    this.likeFilter = { field, pattern };
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  execute(): QueryResult {
    const store = loadDemoStore();

    if (this.pendingInsert) {
      const base = { id: uuid(), created_at: new Date().toISOString(), ...this.pendingInsert };
      const row: Row =
        this.table === "ventes" ? { status: "active", ...base } : base;

      if (this.table === "voitures" && row.numero_chassis) {
        const exists = store.voitures.some((v) => v.numero_chassis === row.numero_chassis);
        if (exists) {
          return { data: null, error: { message: "Numéro de châssis déjà utilisé" } };
        }
      }

      if (this.table === "ventes" && row.numero_facture) {
        const exists = store.ventes.some((v) => v.numero_facture === row.numero_facture);
        if (exists) {
          return { data: null, error: { message: "Numéro de facture déjà utilisé" } };
        }
      }

      const tableKey = this.table as "voitures" | "ventes" | "paiements_vente";
      const tableRows = store[tableKey] as unknown as Row[] | undefined;
      if (!tableRows) {
        return { data: null, error: { message: `Table ${this.table} inconnue` } };
      }

      tableRows.push(row);
      saveDemoStore(store);
      return { data: this.isSingle ? row : [row], error: null };
    }

    if (this.pendingUpdate) {
      if (this.table === "parametres") {
        store.parametres = { ...store.parametres, ...this.pendingUpdate } as typeof store.parametres;
        saveDemoStore(store);
        return { data: store.parametres, error: null };
      }

      const tableKey = this.table as "voitures" | "ventes";
      const rows = store[tableKey] as unknown as Row[];
      const index = rows.findIndex((row) => this.filters.every((f) => f(row)));
      if (index === -1) {
        return { data: null, error: { message: "Enregistrement introuvable" } };
      }
      rows[index] = { ...rows[index], ...this.pendingUpdate };
      saveDemoStore(store);
      return { data: this.isSingle ? rows[index] : [rows[index]], error: null };
    }

    if (this.pendingDelete) {
      if (this.table === "voitures") {
        store.voitures = store.voitures.filter(
          (row) => !this.filters.every((f) => f(row as unknown as Row))
        );
        saveDemoStore(store);
      }
      return { data: null, error: null };
    }

    let rows = this.applyFilters(this.getTableRows(store));

    if (this.countOnly) {
      return { data: null, error: null, count: rows.length };
    }

    rows = this.projectSelect(rows, store);

    if (this.isSingle) {
      if (rows.length === 0) {
        return { data: null, error: { message: "Aucun enregistrement trouvé" } };
      }
      return { data: rows[0], error: null };
    }

    return { data: rows, error: null };
  }

  private getTableRows(store: ReturnType<typeof loadDemoStore>): Row[] {
    if (this.table === "dashboard_stats") {
      return [computeDashboardStats(store) as unknown as Row];
    }
    if (this.table === "parametres") {
      return [store.parametres as unknown as Row];
    }
    return (store[this.table as keyof ReturnType<typeof loadDemoStore>] as unknown as Row[]) ?? [];
  }

  private applyFilters(rows: Row[]): Row[] {
    let result = rows.filter((row) => this.filters.every((f) => f(row)));

    if (this.likeFilter) {
      const regex = new RegExp(
        "^" + this.likeFilter.pattern.replace(/%/g, ".*").replace(/_/g, ".") + "$"
      );
      result = result.filter((row) =>
        regex.test(String(row[this.likeFilter!.field] ?? ""))
      );
    }

    if (this.orderField) {
      result = [...result].sort((a, b) => {
        const av = a[this.orderField!];
        const bv = b[this.orderField!];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return this.orderAsc ? cmp : -cmp;
      });
    }

    if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }

  private attachVoitureJoin(ventes: Row[], store: ReturnType<typeof loadDemoStore>) {
    return ventes.map((vente) => ({
      ...vente,
      voiture: store.voitures.find((v) => v.id === vente.voiture_id) ?? null,
    }));
  }

  private projectSelect(rows: Row[], store: ReturnType<typeof loadDemoStore>): Row[] {
    if (this.selectFields.includes("voiture:voitures")) {
      return this.attachVoitureJoin(rows, store);
    }

    if (this.selectFields !== "*" && !this.selectFields.includes("*")) {
      const fields = this.selectFields.split(",").map((f) => f.trim());
      return rows.map((row) => {
        const projected: Row = {};
        fields.forEach((f) => {
          projected[f] = row[f];
        });
        return projected;
      });
    }

    return rows;
  }
}

function wrapBuilder(builder: DemoQueryBuilder) {
  const handler: ProxyHandler<DemoQueryBuilder> = {
    get(target, prop, receiver) {
      if (prop === "then") {
        return (
          onfulfilled?: ((value: QueryResult) => unknown) | null,
          onrejected?: ((reason: unknown) => unknown) | null
        ) => Promise.resolve(target.execute()).then(onfulfilled, onrejected);
      }
      if (prop === "catch") {
        return (onrejected?: ((reason: unknown) => unknown) | null) =>
          Promise.resolve(target.execute()).catch(onrejected);
      }
      if (prop === "finally") {
        return (onfinally?: (() => void) | null) =>
          Promise.resolve(target.execute()).finally(onfinally ?? undefined);
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          value.apply(target, args);
          return new Proxy(target, handler);
        };
      }
      return value;
    },
  };

  return new Proxy(builder, handler);
}

export function createDemoClient() {
  return {
    from(table: string) {
      return wrapBuilder(new DemoQueryBuilder(table));
    },
    rpc(
      fn: string,
      args: {
        p_vente_id?: string;
        p_cancel_reason?: string | null;
        p_cancelled_from_module?: string;
        p_cancelled_by?: string | null;
      } = {}
    ) {
      if (fn === "annuler_vente" && args.p_vente_id) {
        try {
          annulerVenteDemo(
            args.p_vente_id,
            args.p_cancel_reason ?? undefined,
            args.p_cancelled_from_module,
            args.p_cancelled_by ?? undefined
          );
          return Promise.resolve({ data: null, error: null });
        } catch (e) {
          return Promise.resolve({
            data: null,
            error: { message: e instanceof Error ? e.message : "Erreur inconnue" },
          });
        }
      }
      return Promise.resolve({
        data: null,
        error: { message: `Fonction ${fn} non disponible en mode démo` },
      });
    },
    auth: {
      async signInWithPassword({ email }: { email: string; password: string }) {
        if (!email) return { error: { message: "Email requis" } };
        return { error: null };
      },
      async signUp({ email }: { email: string; password: string }) {
        if (!email) return { error: { message: "Email requis" } };
        return { error: null };
      },
      async signOut() {
        return { error: null };
      },
      async getUser() {
        return {
          data: { user: { id: "demo-user", email: "demo@automali.ml" } },
          error: null,
        };
      },
    },
    storage: {
      from() {
        return {
          async upload(fileName: string) {
            return { error: null, data: { path: fileName } };
          },
          getPublicUrl(fileName: string) {
            return {
              data: {
                publicUrl: `https://placehold.co/400x300/png?text=${encodeURIComponent(fileName)}`,
              },
            };
          },
        };
      },
    },
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;
