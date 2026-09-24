"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ClientListe } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatCourt, pluriel } from "@/lib/format";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
import { ChampRecherche } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { FeuilleClient } from "@/components/clients/feuille-client";

export default function PageClients() {
  const org = useOrg();
  const [q, setQ] = useState("");
  const [nouveau, setNouveau] = useState(false);
  const peutCreer = peut(org.role, "vendre");
  const { data, error, isPending, refetch } = useLecture<ClientListe[]>("clients_lister", { p_org: org.id, p_recherche: q.trim() || null });

  return (
    <>
      <EnTetePage titre="Clients" sousTitre={data ? pluriel(data.length, "client") : undefined}
        actions={peutCreer ? <Bouton variante="primaire" icone={<Plus className="size-4" />} onClick={() => setNouveau(true)}>Nouveau client</Bouton> : undefined} />

      <ChampRecherche className="mb-2" valeur={q} onChange={setQ} libelle="Rechercher un client" placeholder="Nom, téléphone, ville" />

      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !data?.length ? (
        <EtatVide titre="Aucun client" texte={peutCreer ? "Ajoutez votre premier client, ou créez-le directement depuis une vente." : undefined} />
      ) : (
        <ul className="border-t-2 border-encre">
          {data.map((c) => (
            <li key={c.id} className="border-b border-trait last:border-b-0">
              <Link href={`/clients/fiche/?id=${c.id}`} className="flex items-center gap-3 py-3 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.nom}</p>
                  <p className="truncate text-petit text-encre-3">{[c.telephone, c.ville].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                {c.nb_demandes_ouvertes > 0 && <span className="etiquette shrink-0 text-petit text-acier">{pluriel(c.nb_demandes_ouvertes, "demande")}</span>}
                {c.reste_du_xof > 0 && <span className="chiffres shrink-0 font-semibold text-ocre">{formatCourt(c.reste_du_xof)}</span>}
                <span className="shrink-0 text-petit text-encre-3">{pluriel(c.nb_achats, "achat")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <FeuilleClient ouverte={nouveau} onFermer={() => setNouveau(false)} />
    </>
  );
}
