"use client";

import { useState } from "react";
import { Copy, UserPlus, WhatsappLogo, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useEcriture, useLecture } from "@/lib/api/requetes";
import { useOrg } from "@/lib/session";
import { ROLES, type Role } from "@/lib/domaine";
import { formatDate } from "@/lib/format";
import { lienWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { EnTeteSection } from "@/components/parametres/en-tete-section";
import { Bouton, classesBouton } from "@/components/ui/bouton";
import { Feuille } from "@/components/ui/feuille";
import { Selection } from "@/components/ui/champ";
import { EtatErreur, SqueletteListe } from "@/components/ui/etats";
import { Code } from "@/components/ui/signature";

interface Membre { user_id: string; email: string | null; nom_affiche: string | null; telephone: string | null; role: Role; actif: boolean; created_at: string; moi: boolean }
interface Invitation { id: string; code: string; role: Role; expire_le: string; created_at: string }
const ROLES_INVITABLES: Role[] = ["gerant", "vendeur", "comptable", "lecture"];

export default function PageEquipe() {
  const org = useOrg();
  const proprietaire = org.role === "proprietaire";
  const { data, error, isPending, refetch } = useLecture<{ membres: Membre[]; invitations: Invitation[] }>("membres_lister", { p_org: org.id });
  const [inviter, setInviter] = useState(false);
  const [role, setRole] = useState<Role>("vendeur");
  const [nouvelle, setNouvelle] = useState<Invitation | null>(null);

  const creer = useEcriture<Invitation>("invitation_creer", { onSuccess: (i) => setNouvelle(i), onError: (e) => toast.error(e.message) });
  const annulerInvitation = useEcriture("invitation_annuler", { onSuccess: () => toast.success("Invitation annulée"), onError: (e) => toast.error(e.message) });
  const modifier = useEcriture("membre_modifier", { onSuccess: () => toast.success("Membre mis à jour"), onError: (e) => toast.error(e.message) });

  const lien = (code: string) => `${typeof window === "undefined" ? "" : window.location.origin}/rejoindre/?code=${code}`;
  const message = (i: Invitation) => `Bonjour, je vous invite à rejoindre ${org.nom} sur Parc Auto en tant que ${ROLES[i.role].libelle.toLowerCase()}. Créez votre compte puis utilisez ce lien : ${lien(i.code)} (code ${i.code}).`;

  return (
    <>
      <EnTeteSection cle="equipe" titre="Équipe" sousTitre="Chaque personne a son compte : le journal sait qui a fait quoi."
        actions={proprietaire ? <Bouton variante="primaire" icone={<UserPlus className="size-4" />} onClick={() => { setNouvelle(null); setInviter(true); }}>Inviter</Bouton> : undefined} />

      {error && !data ? <EtatErreur erreur={error} onReessayer={() => void refetch()} /> : isPending || !data ? <SqueletteListe lignes={3} /> : (
        <>
          <ul className="overflow-hidden carte">
            {data.membres.map((m) => (
              <li key={m.user_id} className={cn("flex flex-col gap-3 border-b border-trait px-4 py-3 last:border-b-0 sm:flex-row sm:items-center", !m.actif && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.nom_affiche || m.email}{m.moi && <span className="ml-2 text-[12px] font-normal text-encre-3">vous</span>}</p>
                  {/* Le téléphone n'est jamais coupé : sur téléphone, il passe à la ligne sous l'e-mail. */}
                  <p className="flex flex-wrap gap-x-2 text-[14px] text-encre-3">
                    {m.email && <span className="min-w-0 [overflow-wrap:anywhere]">{m.email}</span>}
                    {m.email && m.telephone && <span aria-hidden>·</span>}
                    {m.telephone && <span className="chiffres whitespace-nowrap">{m.telephone}</span>}
                    {!m.actif && <span>· désactivé</span>}
                  </p>
                </div>
                {proprietaire && !m.moi && m.role !== "proprietaire" ? (
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${m.user_id}`}>Rôle de {m.nom_affiche || m.email}</label>
                    <select id={`role-${m.user_id}`} value={m.role} onChange={(e) => modifier.executer({ p_org: org.id, p_user: m.user_id, p_role: e.target.value })}
                      className="h-11 rounded-controle border border-trait-fort bg-surface px-3 text-[14px] lg:h-10">
                      {ROLES_INVITABLES.map((r) => <option key={r} value={r}>{ROLES[r].libelle}</option>)}
                    </select>
                    <Bouton taille="sm" variante={m.actif ? "danger" : "secondaire"} onClick={() => modifier.executer({ p_org: org.id, p_user: m.user_id, p_actif: !m.actif })}>
                      {m.actif ? "Désactiver" : "Réactiver"}
                    </Bouton>
                  </div>
                ) : (
                  <span className="etiquette text-[12px] text-encre-2">{ROLES[m.role].libelle}</span>
                )}
              </li>
            ))}
          </ul>

          {proprietaire && data.invitations.length > 0 && (
            <section className="mt-6 lg:mt-8">
              <h2 className="etiquette mb-2 text-[12px] text-encre-3">Invitations en attente</h2>
              <ul className="overflow-hidden carte">
                {data.invitations.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 border-b border-trait px-4 py-3 last:border-b-0">
                    <Code className="text-[16px]">{i.code}</Code>
                    <span className="flex-1 text-[14px] text-encre-2">{ROLES[i.role].libelle} · expire le {formatDate(i.expire_le)}</span>
                    <a href={lienWhatsApp(null, message(i))} target="_blank" rel="noopener" aria-label="Envoyer par WhatsApp" className="inline-flex size-11 items-center justify-center rounded-controle text-encre-2 hover:bg-surface-2 lg:size-10"><WhatsappLogo className="size-4" /></a>
                    <button type="button" aria-label={`Annuler l'invitation ${i.code}`} onClick={() => annulerInvitation.executer({ p_org: org.id, p_id: i.id })}
                      className="inline-flex size-11 items-center justify-center rounded-controle text-encre-3 hover:bg-surface-2 hover:text-perte-texte lg:size-10"><X className="size-4" /></button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="carte mt-6 p-4 lg:mt-8 lg:p-6">
            <h2 className="etiquette mb-3 text-[12px] text-encre-3">Ce que chaque rôle peut faire</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(ROLES) as Role[]).map((r) => (
                <div key={r}><dt className="font-semibold">{ROLES[r].libelle}</dt><dd className="text-[14px] text-encre-2">{ROLES[r].description}</dd></div>
              ))}
            </dl>
          </section>
        </>
      )}

      <Feuille ouverte={inviter} onFermer={() => setInviter(false)} titre={nouvelle ? "Invitation créée" : "Inviter une personne"}
        description={nouvelle ? "Transmettez ce code : il est valable 7 jours et ne sert qu'une fois." : "Elle crée son compte, puis saisit le code."}
        pied={nouvelle ? (
          <>
            <Bouton icone={<Copy className="size-4" />} onClick={() => { void navigator.clipboard?.writeText(message(nouvelle)); toast.success("Message copié"); }}>Copier</Bouton>
            <a href={lienWhatsApp(null, message(nouvelle))} target="_blank" rel="noopener" className={classesBouton("primaire")}>
              <WhatsappLogo className="size-4" aria-hidden /> WhatsApp
            </a>
          </>
        ) : (
          <>
            <Bouton onClick={() => setInviter(false)}>Annuler</Bouton>
            <Bouton variante="primaire" chargement={creer.isPending} onClick={() => creer.executer({ p_org: org.id, p_role: role })}>Créer le code</Bouton>
          </>
        )}>
        {nouvelle ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Code className="text-[32px] tracking-[0.25em]">{nouvelle.code}</Code>
            <p className="text-[14px] text-encre-2">Rôle : {ROLES[nouvelle.role].libelle}</p>
          </div>
        ) : (
          <>
            <Selection libelle="Rôle" value={role} onChange={(e) => setRole(e.target.value as Role)}
              options={ROLES_INVITABLES.map((r) => ({ valeur: r, libelle: ROLES[r].libelle }))} />
            <p className="mt-2 text-[14px] text-encre-2">{ROLES[role].description}</p>
          </>
        )}
      </Feuille>
    </>
  );
}
