"use client";

// Qui est connecté, dans quelle entreprise, avec quel rôle — en production (Supabase Auth)
// comme en démonstration (utilisateur local fixe).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { choisirMode, modeActuel, rpc, type Mode } from "@/lib/api/client";
import type { Role } from "@/lib/domaine";

export interface Organisation {
  id: string;
  nom: string;
  role: Role;
  ville: string | null;
}

export type EtatSession =
  | { statut: "chargement" }
  | { statut: "deconnecte"; mode: Mode }
  | { statut: "erreur"; mode: Mode; message: string }
  | {
      statut: "connecte";
      mode: Mode;
      utilisateur: { id: string; email: string | null };
      organisations: Organisation[];
      org: Organisation | null;
    };

interface ContexteSession {
  etat: EtatSession;
  choisirOrganisation: (id: string) => void;
  entrerDemo: () => Promise<void>;
  deconnecter: () => Promise<void>;
  recharger: () => Promise<void>;
}

const Contexte = createContext<ContexteSession | null>(null);
const CLE_ORG = "parc-auto:org";

function lireOrganisations(brut: unknown): Organisation[] {
  const liste = Array.isArray(brut) ? brut : ((brut as { organisations?: unknown[] })?.organisations ?? []);
  return liste.map((o) => {
    const x = o as Record<string, unknown>;
    return {
      id: String(x.id ?? x.org_id),
      nom: String(x.nom ?? x.nom_commercial ?? "Mon entreprise"),
      role: String(x.role) as Role,
      ville: (x.ville as string | null) ?? null,
    };
  });
}

async function utilisateurSupabase() {
  const { supabase } = await import("@/lib/api/supabase");
  const { data } = await supabase().auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ statut: "chargement" });
  const client = useQueryClient();

  const charger = useCallback(async () => {
    const mode = modeActuel();
    try {
      let utilisateur: { id: string; email: string | null } | null;
      if (mode === "demo") {
        // Sans projet Supabase configuré, le mode vaut « demo » par défaut : on n'entre dans la
        // démonstration que si l'utilisateur l'a demandée (bouton « Essayer la démo »).
        if (localStorage.getItem("parc-auto:mode") !== "demo") {
          setEtat({ statut: "deconnecte", mode });
          return;
        }
        const { UTILISATEUR_DEMO, EMAIL_DEMO, baseDemo } = await import("@/lib/demo/moteur");
        await baseDemo();
        utilisateur = { id: UTILISATEUR_DEMO, email: EMAIL_DEMO };
      } else {
        utilisateur = await utilisateurSupabase();
      }
      if (!utilisateur) {
        setEtat({ statut: "deconnecte", mode });
        return;
      }
      const organisations = lireOrganisations(await rpc("mes_organisations"));
      const memorisee = localStorage.getItem(CLE_ORG);
      const org = organisations.find((o) => o.id === memorisee) ?? organisations[0] ?? null;
      if (org) localStorage.setItem(CLE_ORG, org.id);
      setEtat({ statut: "connecte", mode, utilisateur, organisations, org });
    } catch (e) {
      setEtat({ statut: "erreur", mode, message: e instanceof Error ? e.message : "Erreur inconnue" });
    }
  }, []);

  useEffect(() => {
    void charger();
    if (modeActuel() !== "supabase") return;
    let desabonner: (() => void) | undefined;
    void import("@/lib/api/supabase").then(({ supabase }) => {
      const { data } = supabase().auth.onAuthStateChange((evenement) => {
        if (evenement === "SIGNED_IN" || evenement === "SIGNED_OUT" || evenement === "USER_UPDATED") void charger();
      });
      desabonner = () => data.subscription.unsubscribe();
    });
    return () => desabonner?.();
  }, [charger]);

  const valeur = useMemo<ContexteSession>(() => ({
    etat,
    recharger: charger,
    choisirOrganisation: (id) => {
      localStorage.setItem(CLE_ORG, id);
      setEtat((e) => (e.statut === "connecte" ? { ...e, org: e.organisations.find((o) => o.id === id) ?? e.org } : e));
      void client.invalidateQueries({ queryKey: ["api"] });
    },
    entrerDemo: async () => {
      choisirMode("demo");
      setEtat({ statut: "chargement" });
      await charger();
    },
    deconnecter: async () => {
      if (modeActuel() === "supabase") {
        const { supabase } = await import("@/lib/api/supabase");
        await supabase().auth.signOut();
      }
      choisirMode("supabase");
      localStorage.removeItem(CLE_ORG);
      client.clear();
      setEtat({ statut: "deconnecte", mode: modeActuel() });
    },
  }), [etat, charger, client]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession(): ContexteSession {
  const c = useContext(Contexte);
  if (!c) throw new Error("useSession hors de FournisseurSession");
  return c;
}

/** Entreprise active — à n'utiliser que sous <GardeSession>, où elle est garantie. */
export function useOrg(): Organisation {
  const { etat } = useSession();
  if (etat.statut !== "connecte" || !etat.org) throw new Error("Aucune entreprise active");
  return etat.org;
}
