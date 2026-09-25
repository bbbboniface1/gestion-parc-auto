"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ClientListe } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatCourt, pluriel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
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

      <label className="relative mb-4 block max-w-sm">
        <span className="sr-only">Rechercher un client</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-encre-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone, ville…"
          className="h-11 w-full rounded-controle border border-trait-fort bg-surface pl-9 text-[15px] focus:border-primaire focus:outline-none lg:h-10 lg:text-sm" />
      </label>

      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !data?.length ? (
        <EtatVide titre="Aucun client" texte={peutCreer ? "Ajoutez votre premier client, ou créez-le directement depuis une vente." : undefined} />
      ) : (
        <ul className="overflow-hidden carte">
          {data.map((c) => (
            <li key={c.id} className="border-b border-trait last:border-b-0">
              <Link href={`/clients/fiche/?id=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.nom}</p>
                  <p className="truncate text-[13px] text-encre-3">{[c.telephone, c.ville].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                {c.nb_demandes_ouvertes > 0 && <span className="etiquette shrink-0 rounded-[4px] bg-acier-voile px-1.5 py-0.5 text-[11px] text-acier">{pluriel(c.nb_demandes_ouvertes, "demande")}</span>}
                {c.reste_du_xof > 0 && <span className={cn("chiffres shrink-0 text-[14px] font-medium text-ocre-texte")}>{formatCourt(c.reste_du_xof)}</span>}
                <span className="shrink-0 text-[13px] text-encre-3">{pluriel(c.nb_achats, "achat")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <FeuilleClient ouverte={nouveau} onFermer={() => setNouveau(false)} />
    </>
  );
}
