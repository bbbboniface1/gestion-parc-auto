"use client";

import { ChampTelephone } from "@/components/ui/champ-telephone";
import { telephoneValide } from "@/lib/telephone";
import { useState } from "react";
import { toast } from "sonner";
import { nouvelId, useEcriture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { Feuille } from "@/components/ui/feuille";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Selection, ZoneTexte } from "@/components/ui/champ";
import { useAuChangement } from "@/lib/reinitialiser";

const PIECES = [{ valeur: "NINA", libelle: "NINA" }, { valeur: "CNI", libelle: "CNI" }, { valeur: "passeport", libelle: "Passeport" }, { valeur: "autre", libelle: "Autre" }];

interface ClientAModifier {
  id: string; nom: string; telephone: string | null; whatsapp: string | null; ville: string | null;
  adresse: string | null; type_piece: string | null; numero_piece: string | null; notes: string | null;
}

export function FeuilleClient({ ouverte, onFermer, client, onCree }: {
  ouverte: boolean; onFermer: () => void; client?: ClientAModifier | null; onCree?: (id: string) => void;
}) {
  const org = useOrg();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [typePiece, setTypePiece] = useState("");
  const [numeroPiece, setNumeroPiece] = useState("");
  const [notes, setNotes] = useState("");
  const [id, setId] = useState(nouvelId);

  useAuChangement([ouverte, client?.id], () => {
    if (!ouverte) return;
    setNom(client?.nom ?? ""); setTelephone(client?.telephone ?? ""); setWhatsapp(client?.whatsapp ?? "");
    setVille(client?.ville ?? ""); setAdresse(client?.adresse ?? ""); setTypePiece(client?.type_piece ?? "");
    setNumeroPiece(client?.numero_piece ?? ""); setNotes(client?.notes ?? ""); setId(client?.id ?? nouvelId());
  });

  const enregistrer = useEcriture<{ id: string }>("client_enregistrer", {
    onSuccess: (c) => { toast.success(client ? "Client modifié" : "Client ajouté"); onFermer(); onCree?.(c?.id ?? id); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={client ? "Modifier le client" : "Nouveau client"} pleinEcran
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={nom.trim().length < 2 || !telephoneValide(telephone) || !telephoneValide(whatsapp)} chargement={enregistrer.isPending} onClick={() => enregistrer.executer({
          p_org: org.id, p_data: {
            id, nom: nom.trim(), telephone: telephone.trim() || null, whatsapp: whatsapp.trim() || null,
            ville: ville.trim() || null, adresse: adresse.trim() || null, type_piece: typePiece || null,
            numero_piece: numeroPiece.trim() || null, notes: notes.trim() || null,
          },
        })}>Enregistrer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <Champ libelle="Nom complet" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
        <ChampTelephone libelle="Téléphone" valeur={telephone} onChange={setTelephone} />
        <ChampTelephone libelle="WhatsApp" facultatif valeur={whatsapp} onChange={setWhatsapp} aide="Seulement s'il diffère du téléphone." />
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Ville" facultatif value={ville} onChange={(e) => setVille(e.target.value)} />
          <Champ libelle="Adresse" facultatif value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Selection libelle="Pièce d'identité" facultatif vide="Non précisé" value={typePiece} onChange={(e) => setTypePiece(e.target.value)} options={PIECES} />
          <Champ libelle="Numéro" facultatif mono value={numeroPiece} onChange={(e) => setNumeroPiece(e.target.value)} />
        </div>
        <ZoneTexte libelle="Notes" facultatif value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Feuille>
  );
}
