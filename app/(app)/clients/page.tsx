"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CurrencyCircleDollar, Handshake, MagnifyingGlassPlus, Phone, UserPlus, UsersThree, WhatsappLogo } from "@phosphor-icons/react";
import { useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import type { ClientListe } from "@/lib/api/types-metier";
import { peut } from "@/lib/domaine";
import { formatCourt, formatDate, pluriel } from "@/lib/format";
import { lienWhatsApp } from "@/lib/whatsapp";
import { decalage } from "@/lib/animation";
import { EnTetePage } from "@/components/coque/coque";
import { Bouton } from "@/components/ui/bouton";
import { Avatar } from "@/components/ui/avatar";
import { BarreRecherche, Indicateur, Puces } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { FeuilleClient } from "@/components/clients/feuille-client";

type Filtre = "tous" | "doivent" | "cherchent";

function CarteClient({ c, index }: { c: ClientListe; index: number }) {
  const tel = c.whatsapp || c.telephone;
  return (
    <li className="carte carte-lien apparition flex flex-col gap-3 p-4" style={decalage(Math.min(index, 12), 40)}>
      <Link href={`/clients/fiche/?id=${c.id}`} className="group flex items-center gap-3">
        <Avatar nom={c.nom} taille={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold group-hover:text-primaire">{c.nom}</span>
          <span className="block truncate text-[13px] text-encre-3">{[c.telephone, c.ville].filter(Boolean).join(" · ") || "Pas de coordonnées"}</span>
        </span>
      </Link>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-2.5 text-center">
        <span><span className="chiffres block text-[16px] font-extrabold">{c.nb_achats}</span><span className="text-[11px] text-encre-3">{c.nb_achats > 1 ? "achats" : "achat"}</span></span>
        <span><span className="chiffres block text-[16px] font-extrabold">{formatCourt(c.total_achats_xof)}</span><span className="text-[11px] text-encre-3">acheté</span></span>
        <span>
          <span className={`chiffres block text-[16px] font-extrabold ${c.reste_du_xof > 0 ? "text-ocre-texte" : "text-gain-texte"}`}>{c.reste_du_xof > 0 ? formatCourt(c.reste_du_xof) : "0"}</span>
          <span className="text-[11px] text-encre-3">reste dû</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {c.nb_demandes_ouvertes > 0 && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-acier-voile px-2.5 text-[12px] font-bold text-acier">
            <MagnifyingGlassPlus size={14} weight="bold" aria-hidden /> Cherche {pluriel(c.nb_demandes_ouvertes, "véhicule")}
          </span>
        )}
        {c.derniere_vente && <span className="text-[12px] text-encre-3">Dernier achat le {formatDate(c.derniere_vente)}</span>}
        {tel && (
          <span className="ml-auto flex gap-1.5">
            <a href={`tel:${c.telephone ?? tel}`} aria-label={`Appeler ${c.nom}`} className="onde grid size-10 place-items-center rounded-full bg-primaire-voile text-primaire transition-transform hover:scale-105">
              <Phone size={18} weight="fill" aria-hidden />
            </a>
            <a href={lienWhatsApp(tel, `Bonjour ${c.nom},`)} target="_blank" rel="noopener" aria-label={`Écrire à ${c.nom} sur WhatsApp`} className="onde grid size-10 place-items-center rounded-full bg-[#25d366] text-[#062b14] shadow-[0_6px_14px_-6px_#25d366] transition-transform hover:scale-105">
              <WhatsappLogo size={19} weight="fill" aria-hidden />
            </a>
          </span>
        )}
      </div>
    </li>
  );
}

export default function PageClients() {
  const org = useOrg();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [nouveau, setNouveau] = useState(false);
  const peutCreer = peut(org.role, "vendre");
  const { data, error, isPending, refetch } = useLecture<ClientListe[]>("clients_lister", { p_org: org.id, p_recherche: null });

  const tous = useMemo(() => data ?? [], [data]);
  const visibles = useMemo(() => {
    const motif = q.trim().toLowerCase();
    return tous.filter((c) => {
      if (filtre === "doivent" && c.reste_du_xof <= 0) return false;
      if (filtre === "cherchent" && c.nb_demandes_ouvertes <= 0) return false;
      return !motif || [c.nom, c.telephone, c.ville, c.whatsapp].some((x) => x?.toLowerCase().includes(motif));
    });
  }, [tous, q, filtre]);
  const doivent = tous.filter((c) => c.reste_du_xof > 0);
  const cherchent = tous.filter((c) => c.nb_demandes_ouvertes > 0);

  return (
    <>
      <EnTetePage titre="Clients" sousTitre="Vos acheteurs, ce qu'ils doivent, ce qu'ils cherchent."
        actions={peutCreer ? <Bouton variante="primaire" icone={<UserPlus size={18} weight="bold" />} onClick={() => setNouveau(true)}>Nouveau client</Bouton> : undefined} />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicateur index={0} libelle="Clients" valeur={tous.length} format={(x) => String(Math.round(x))} precision={`${tous.filter((c) => c.nb_achats > 0).length} ont déjà acheté`} icone={UsersThree} couleur="var(--reserve)" />
          <Indicateur index={1} libelle="Total acheté" valeur={tous.reduce((s, c) => s + c.total_achats_xof, 0)} format={formatCourt} precision="FCFA, tous clients" icone={Handshake} couleur="var(--gain)" />
          <Indicateur index={2} libelle="Reste dû" valeur={doivent.reduce((s, c) => s + c.reste_du_xof, 0)} format={formatCourt} precision={pluriel(doivent.length, "client")} icone={CurrencyCircleDollar} couleur="var(--accent)" />
          <Indicateur index={3} libelle="Demandes ouvertes" valeur={cherchent.reduce((s, c) => s + c.nb_demandes_ouvertes, 0)} format={(x) => String(Math.round(x))} precision="véhicules recherchés" icone={MagnifyingGlassPlus} couleur="var(--acier)" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <BarreRecherche valeur={q} onChange={setQ} libelle="Rechercher un client" placeholder="Nom, téléphone, ville…" />
        <Puces valeur={filtre} onChange={setFiltre} libelle="Filtrer les clients" options={[
          { valeur: "tous", libelle: "Tous", nombre: tous.length },
          { valeur: "doivent", libelle: "Doivent de l'argent", nombre: doivent.length, couleur: "var(--accent)" },
          { valeur: "cherchent", libelle: "Cherchent un véhicule", nombre: cherchent.length, couleur: "var(--acier)" },
        ]} />
      </div>

      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending ? <SqueletteListe /> : !visibles.length ? (
        <EtatVide titre={tous.length ? "Aucun client ne correspond" : "Aucun client"} texte={peutCreer && !tous.length ? "Ajoutez votre premier client, ou créez-le directement depuis une vente." : undefined} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((c, i) => <CarteClient key={c.id} c={c} index={i} />)}
        </ul>
      )}

      <FeuilleClient ouverte={nouveau} onFermer={() => setNouveau(false)} />
    </>
  );
}
