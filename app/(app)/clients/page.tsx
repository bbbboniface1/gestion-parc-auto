"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CurrencyCircleDollar, MagnifyingGlassPlus, Phone, UserPlus, WhatsappLogo } from "@phosphor-icons/react";
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
import { BarreRecherche, Puces } from "@/components/ui/recherche";
import { EtatErreur, EtatVide, SqueletteListe } from "@/components/ui/etats";
import { TuileIndicateur } from "@/components/metier/tableau-bord";
import { FeuilleClient } from "@/components/clients/feuille-client";

type Filtre = "tous" | "doivent" | "cherchent";

/**
 * Ligne client : la personne (avatar, nom, coordonnées), ses trois chiffres sur un fond calme, puis ce qui appelle
 * une action (demande ouverte) et les deux moyens de la joindre, en cibles de 44 px.
 */
function CarteClient({ c, index }: { c: ClientListe; index: number }) {
  const tel = c.whatsapp || c.telephone;
  return (
    <li className="carte carte-lien apparition flex min-w-0 flex-col gap-4 p-4" style={decalage(Math.min(index, 12), 40)}>
      <Link href={`/clients/fiche/?id=${c.id}`} className="group flex min-w-0 items-center gap-3">
        <Avatar nom={c.nom} taille={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold group-hover:text-primaire">{c.nom}</span>
          <span className="block truncate text-[14px] text-encre-3">{[c.telephone, c.ville].filter(Boolean).join(" · ") || "Pas de coordonnées"}</span>
        </span>
      </Link>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
        <span className="min-w-0"><span className="chiffres block text-[16px] font-extrabold">{c.nb_achats}</span><span className="text-[12px] text-encre-3">{c.nb_achats > 1 ? "achats" : "achat"}</span></span>
        <span className="min-w-0"><span className="chiffres block text-[16px] font-extrabold">{formatCourt(c.total_achats_xof)}</span><span className="text-[12px] text-encre-3">acheté</span></span>
        <span className="min-w-0">
          <span className={`chiffres block text-[16px] font-extrabold ${c.reste_du_xof > 0 ? "text-ocre-texte" : "text-gain-texte"}`}>{c.reste_du_xof > 0 ? formatCourt(c.reste_du_xof) : "0"}</span>
          <span className="text-[12px] text-encre-3">reste dû</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {c.nb_demandes_ouvertes > 0 && (
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-acier-voile px-3 text-[12px] font-bold text-acier">
            <MagnifyingGlassPlus size={14} weight="bold" aria-hidden /> Cherche {pluriel(c.nb_demandes_ouvertes, "véhicule")}
          </span>
        )}
        {c.derniere_vente && <span className="text-[12px] text-encre-3">Dernier achat le {formatDate(c.derniere_vente)}</span>}
        {tel && (
          <span className="ml-auto flex gap-2">
            <a href={`tel:${c.telephone ?? tel}`} aria-label={`Appeler ${c.nom}`} className="onde grid size-11 place-items-center rounded-full bg-primaire-voile text-primaire transition-transform hover:scale-[1.03] lg:size-10">
              <Phone size={20} weight="fill" aria-hidden />
            </a>
            <a href={lienWhatsApp(tel, `Bonjour ${c.nom},`)} target="_blank" rel="noopener" aria-label={`Écrire à ${c.nom} sur WhatsApp`} className="onde grid size-11 place-items-center rounded-full bg-marque-whatsapp text-sur-marque-whatsapp transition-transform hover:scale-[1.03] lg:size-10">
              <WhatsappLogo size={20} weight="fill" aria-hidden />
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

      {/* Deux niveaux (docs/CONVENTIONS_FRONT.md, « Mesures et hiérarchie ») :
       *  1. premier plan — ce qui appelle une action : l'argent à encaisser et les véhicules recherchés ;
       *  2. second plan, plus calme — la taille du fichier clients et le total acheté. */}
      <div className="flex flex-col gap-6 lg:gap-8">
        {data && (
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-8 lg:gap-6">
              <TuileIndicateur index={0} libelle="Reste dû" valeur={doivent.reduce((s, c) => s + c.reste_du_xof, 0)} complement={pluriel(doivent.length, "client")}
                couleur="var(--accent)" icone={<CurrencyCircleDollar className="size-5" />} />
              <TuileIndicateur index={1} libelle="Demandes ouvertes" valeur={cherchent.reduce((s, c) => s + c.nb_demandes_ouvertes, 0)} format={(x) => String(Math.round(x))}
                complement="véhicules recherchés" couleur="var(--acier)" icone={<MagnifyingGlassPlus className="size-5" />} />
            </div>
            <div className="carte apparition grid min-w-0 grid-cols-2 gap-4 p-4 lg:col-span-4 lg:p-6" style={decalage(2, 60)}>
              <div className="min-w-0">
                <span className="block text-[14px] text-encre-3">Clients</span>
                <span className="chiffres mt-1 block text-[24px] leading-tight font-bold text-encre">{tous.length}</span>
                <span className="mt-1 block text-[12px] text-encre-3">{`${tous.filter((c) => c.nb_achats > 0).length} ont déjà acheté`}</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[14px] text-encre-3">Total acheté</span>
                <span className="chiffres mt-1 block text-[24px] leading-tight font-bold text-encre">{formatCourt(tous.reduce((s, c) => s + c.total_achats_xof, 0))}</span>
                <span className="mt-1 block text-[12px] text-encre-3">FCFA, tous clients</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
            <ul className="grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
              {visibles.map((c, i) => <CarteClient key={c.id} c={c} index={i} />)}
            </ul>
          )}
        </div>
      </div>

      <FeuilleClient ouverte={nouveau} onFermer={() => setNouveau(false)} />
    </>
  );
}
