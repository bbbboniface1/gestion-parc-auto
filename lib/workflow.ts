// Workflow du véhicule : l'étape du véhicule et l'état de son conteneur doivent toujours raconter la même histoire.
// Ces règles sont pures (sans réseau) : elles servent au parc, à la fiche véhicule, à l'expédition, au tableau
// de bord et à la navigation, et sont testées à part (tests/unit/workflow.test.ts).

import { ETAPES, ORDRE_ETAPES, etape as defEtape, etapeSuivante, type Etape } from "@/lib/domaine";

export type StatutExpedition = "preparation" | "en_mer" | "arrivee" | "cloturee";

export interface ConteneurResume {
  id: string;
  reference: string;
  statut: StatutExpedition;
  port_arrivee: string | null;
  numero_conteneur?: string | null;
}

export interface VehiculeWorkflow {
  etape: Etape;
  archive?: boolean;
  statut_commercial?: "disponible" | "reserve" | "vendu";
  expedition: ConteneurResume | null;
}

const rang = (e: Etape) => ORDRE_ETAPES.indexOf(e);
const EN_TRANSIT: Etape[] = ["transport_usa", "en_mer"];

/** Étape qu'un véhicule doit avoir au minimum quand son conteneur est dans tel état. */
export function etapeMinimale(statut: StatutExpedition): Etape | null {
  if (statut === "en_mer") return "en_mer";
  if (statut === "arrivee") return "au_port";
  return null;
}

export type CodeIncoherence = "sans_conteneur" | "en_retard_sur_conteneur" | "conteneur_pas_parti" | "en_avance_sur_conteneur";

export interface Incoherence {
  code: CodeIncoherence;
  /** Ce que voit l'utilisateur : une phrase, pas un code. */
  titre: string;
  detail: string;
  /** Correction proposée : aligner l'étape du véhicule, ou choisir / quitter un conteneur, ou faire partir le conteneur. */
  correction: { genre: "aligner"; vers: Etape } | { genre: "choisir_conteneur" } | { genre: "quitter_conteneur" } | { genre: "conteneur_parti" };
  libelleCorrection: string;
}

/** Détecte ce qui cloche entre l'étape d'un véhicule et son conteneur. `null` quand tout concorde. */
export function incoherence(v: VehiculeWorkflow): Incoherence | null {
  if (v.archive || v.statut_commercial === "vendu") return null;
  const e = v.etape;
  const c = v.expedition;

  if (!c) {
    if (!EN_TRANSIT.includes(e)) return null;
    return {
      code: "sans_conteneur",
      titre: e === "en_mer" ? "En mer, mais dans aucun conteneur" : "En route vers le port, sans conteneur",
      detail: "Sans conteneur, on ne sait ni sur quel navire il voyage, ni quand il arrive, ni à qui répartir le fret.",
      correction: { genre: "choisir_conteneur" },
      libelleCorrection: "Mettre dans un conteneur",
    };
  }
  if (c.statut === "cloturee") return null;

  const mini = etapeMinimale(c.statut);
  if (mini && rang(e) < rang(mini)) {
    return {
      code: "en_retard_sur_conteneur",
      titre: `Encore « ${defEtape(e).libelle} » alors que ${c.reference} ${c.statut === "en_mer" ? "est parti" : "est arrivé"}`,
      detail: `Son conteneur est « ${c.statut === "en_mer" ? "En mer" : "Arrivé au port"} » : le véhicule devrait l'être aussi.`,
      correction: { genre: "aligner", vers: mini },
      libelleCorrection: `Passer à « ${defEtape(mini).libelle} »`,
    };
  }
  if (c.statut === "preparation" && rang(e) >= rang("en_mer")) {
    return {
      code: "conteneur_pas_parti",
      titre: `« ${defEtape(e).libelle} », mais ${c.reference} n'est pas encore parti`,
      detail: "Le véhicule est marqué en mer alors que son conteneur est toujours en préparation.",
      correction: { genre: "conteneur_parti" },
      libelleCorrection: `${c.reference} a embarqué`,
    };
  }
  if (c.statut === "en_mer" && rang(e) > rang("en_mer")) {
    return {
      code: "en_avance_sur_conteneur",
      titre: `Déjà « ${defEtape(e).libelle} » alors que ${c.reference} est toujours en mer`,
      detail: "Le véhicule a dépassé l'étape de son conteneur : il n'en fait probablement plus partie.",
      correction: { genre: "quitter_conteneur" },
      libelleCorrection: `Sortir de ${c.reference}`,
    };
  }
  return null;
}

/** La prochaine chose à faire pour ce véhicule : un seul geste, formulé comme une phrase du métier. */
export type ProchaineAction =
  | { genre: "etape"; vers: Etape; titre: string; detail: string }
  | { genre: "choisir_conteneur"; titre: string; detail: string }
  | { genre: "conteneur_statut"; statut: "en_mer" | "arrivee"; expeditionId: string; titre: string; detail: string };

const PHRASES: Partial<Record<Etape, { titre: string; detail: string }>> = {
  transport_usa: { titre: "Le véhicule part vers le port", detail: "Il quitte le parc d'enchères : étape « Vers le port »" },
  au_port: { titre: "Le véhicule est arrivé au port", detail: "Étape « Au port » : le magasinage commence à courir" },
  convoi: { titre: "Le véhicule part en convoi", detail: "Il quitte le port pour le Mali : étape « Convoi »" },
  douane: { titre: "Le véhicule arrive en douane", detail: "Étape « Douane » : dédouanement en cours" },
  atelier: { titre: "Le véhicule passe à l'atelier", detail: "Étape « Atelier » : remise en état avant la vente" },
  parc: { titre: "Le véhicule est au parc, prêt à vendre", detail: "Étape « Au parc » : il apparaît dans les véhicules disponibles" },
};

export function prochaineAction(v: VehiculeWorkflow): ProchaineAction | null {
  if (v.archive) return null;
  const suivante = etapeSuivante(v.etape);
  if (!suivante) return null;
  const c = v.expedition && v.expedition.statut !== "cloturee" ? v.expedition : null;

  // Les étapes de la traversée sont pilotées par le conteneur : on agit sur lui, pas véhicule par véhicule.
  if (suivante === "en_mer") {
    if (!c) return { genre: "choisir_conteneur", titre: "Mettre dans un conteneur", detail: "Choisissez ou créez le conteneur qui l'emmène : il passera « En mer » au départ" };
    if (c.statut === "preparation") return { genre: "conteneur_statut", statut: "en_mer", expeditionId: c.id, titre: `${c.reference} a embarqué`, detail: "Tous les véhicules du conteneur passent « En mer », datés d'aujourd'hui" };
  }
  if (v.etape === "en_mer") {
    if (!c) return { genre: "choisir_conteneur", titre: "Mettre dans un conteneur", detail: "Sans conteneur, l'arrivée ne peut pas être suivie" };
    if (c.statut === "en_mer") return { genre: "conteneur_statut", statut: "arrivee", expeditionId: c.id, titre: `${c.reference} est arrivé${c.port_arrivee ? ` à ${c.port_arrivee}` : ""}`, detail: "Tous les véhicules du conteneur passent « Au port », datés d'aujourd'hui" };
  }
  const p = PHRASES[suivante] ?? { titre: `Passer à « ${defEtape(suivante).libelle} »`, detail: `Étape suivante : ${defEtape(suivante).libelle}` };
  return { genre: "etape", vers: suivante, ...p };
}

/** Numéro d'étape pour l'affichage (« étape 3 sur 8 »). */
export function numeroEtape(e: Etape): number {
  return rang(e) + 1;
}
export const NB_ETAPES = ETAPES.length;

/** Regroupe des véhicules par type de souci (tableau de bord, filtre « à vérifier »). */
export function aVerifier<T extends VehiculeWorkflow>(vehicules: T[]): { vehicule: T; souci: Incoherence }[] {
  const r: { vehicule: T; souci: Incoherence }[] = [];
  for (const vehicule of vehicules) {
    const souci = incoherence(vehicule);
    if (souci) r.push({ vehicule, souci });
  }
  return r;
}
