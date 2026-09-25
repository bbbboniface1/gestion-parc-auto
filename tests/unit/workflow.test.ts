import { describe, expect, it } from "vitest";
import { aVerifier, etapeMinimale, incoherence, prochaineAction, type ConteneurResume, type VehiculeWorkflow } from "@/lib/workflow";
import type { Etape } from "@/lib/domaine";

const conteneur = (statut: ConteneurResume["statut"]): ConteneurResume => ({ id: "e1", reference: "EXP-0003", statut, port_arrivee: "Cotonou" });
const v = (etape: Etape, c: ConteneurResume | null = null, extra: Partial<VehiculeWorkflow> = {}): VehiculeWorkflow => ({ etape, expedition: c, ...extra });

describe("cohérence étape du véhicule ↔ conteneur", () => {
  it("le conteneur fixe l'étape minimale", () => {
    expect(etapeMinimale("preparation")).toBeNull();
    expect(etapeMinimale("en_mer")).toBe("en_mer");
    expect(etapeMinimale("arrivee")).toBe("au_port");
    expect(etapeMinimale("cloturee")).toBeNull();
  });

  it("aucun souci quand tout concorde", () => {
    expect(incoherence(v("achete"))).toBeNull();
    expect(incoherence(v("transport_usa", conteneur("preparation")))).toBeNull();
    expect(incoherence(v("en_mer", conteneur("en_mer")))).toBeNull();
    expect(incoherence(v("au_port", conteneur("arrivee")))).toBeNull();
    expect(incoherence(v("douane", conteneur("arrivee")))).toBeNull(); // il a continué après l'arrivée : normal
    expect(incoherence(v("parc", conteneur("cloturee")))).toBeNull();
    expect(incoherence(v("parc"))).toBeNull();
  });

  it("véhicule en transit sans conteneur", () => {
    expect(incoherence(v("transport_usa"))?.code).toBe("sans_conteneur");
    expect(incoherence(v("en_mer"))?.correction).toEqual({ genre: "choisir_conteneur" });
  });

  it("véhicule en retard sur son conteneur : on propose de l'aligner", () => {
    const s = incoherence(v("achete", conteneur("en_mer")));
    expect(s?.code).toBe("en_retard_sur_conteneur");
    expect(s?.correction).toEqual({ genre: "aligner", vers: "en_mer" });
    expect(incoherence(v("en_mer", conteneur("arrivee")))?.correction).toEqual({ genre: "aligner", vers: "au_port" });
    expect(incoherence(v("convoi", conteneur("en_mer")))?.code).toBe("en_avance_sur_conteneur");
  });

  it("véhicule en mer dans un conteneur pas encore parti", () => {
    const s = incoherence(v("en_mer", conteneur("preparation")));
    expect(s?.code).toBe("conteneur_pas_parti");
    expect(s?.correction).toEqual({ genre: "conteneur_parti" });
  });

  it("véhicule vendu ou archivé : rien à signaler", () => {
    expect(incoherence(v("en_mer", null, { statut_commercial: "vendu" }))).toBeNull();
    expect(incoherence(v("en_mer", null, { archive: true }))).toBeNull();
  });

  it("aVerifier ne garde que les véhicules en souci", () => {
    const liste = [v("parc"), v("en_mer"), v("achete", conteneur("arrivee"))];
    expect(aVerifier(liste).map((x) => x.souci.code)).toEqual(["sans_conteneur", "en_retard_sur_conteneur"]);
  });
});

describe("prochaine action du véhicule", () => {
  it("étapes terrestres : un simple changement d'étape, en phrase du métier", () => {
    expect(prochaineAction(v("achete"))).toMatchObject({ genre: "etape", vers: "transport_usa" });
    expect(prochaineAction(v("au_port"))).toMatchObject({ genre: "etape", vers: "convoi", titre: "Le véhicule part en convoi" });
    expect(prochaineAction(v("atelier"))).toMatchObject({ genre: "etape", vers: "parc" });
    expect(prochaineAction(v("parc"))).toBeNull();
  });

  it("le départ en mer passe par le conteneur", () => {
    expect(prochaineAction(v("transport_usa"))).toMatchObject({ genre: "choisir_conteneur" });
    expect(prochaineAction(v("transport_usa", conteneur("preparation")))).toMatchObject({ genre: "conteneur_statut", statut: "en_mer", expeditionId: "e1", titre: "EXP-0003 a embarqué" });
  });

  it("l'arrivée passe par le conteneur", () => {
    expect(prochaineAction(v("en_mer"))).toMatchObject({ genre: "choisir_conteneur" });
    expect(prochaineAction(v("en_mer", conteneur("en_mer")))).toMatchObject({ genre: "conteneur_statut", statut: "arrivee", titre: "EXP-0003 est arrivé à Cotonou" });
  });

  it("conteneur clôturé ou véhicule qui a déjà dépassé : retour au changement d'étape simple", () => {
    expect(prochaineAction(v("en_mer", conteneur("arrivee")))).toMatchObject({ genre: "etape", vers: "au_port" });
    expect(prochaineAction(v("transport_usa", conteneur("cloturee")))).toMatchObject({ genre: "choisir_conteneur" });
  });

  it("véhicule archivé : aucune action", () => {
    expect(prochaineAction(v("achete", null, { archive: true }))).toBeNull();
  });
});
