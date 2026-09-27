"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Car, FileText, MagnifyingGlass, User } from "@phosphor-icons/react";
import { useLecture } from "@/lib/api/requetes";
import { useSession } from "@/lib/session";
import { grouperVin } from "@/lib/vin";
import { EtiquetteEtape } from "@/components/ui/signature";
import { useAuChangement } from "@/lib/reinitialiser";

interface ResultatsRecherche {
  vehicules?: { id: string; libelle?: string; titre?: string; marque?: string; modele?: string; annee?: number; vin?: string | null; reference?: string; etape?: string }[];
  clients?: { id: string; nom: string; telephone?: string | null }[];
  documents?: { id: string; vente_id?: string; type?: string; numero: string; client?: string | null }[];
}

function useDiffere<T>(valeur: T, delai = 250): T {
  const [v, setV] = useState(valeur);
  useEffect(() => {
    const t = setTimeout(() => setV(valeur), delai);
    return () => clearTimeout(t);
  }, [valeur, delai]);
  return v;
}

/** Recherche globale (Ctrl K) : VIN, n° de lot, référence, client, téléphone, n° de facture. */
export function PaletteRecherche({ ouverte, onFermer, onAller }: { ouverte: boolean; onFermer: () => void; onAller: (href: string) => void }) {
  const { etat } = useSession();
  const [saisie, setSaisie] = useState("");
  const q = useDiffere(saisie.trim());
  const org = etat.statut === "connecte" ? etat.org?.id : undefined;
  const { data, isFetching } = useLecture<ResultatsRecherche>("recherche", { p_org: org, p_q: q }, { enabled: !!org && q.length >= 2 });

  useAuChangement([ouverte], () => {
    if (!ouverte) setSaisie("");
  });

  const vide = q.length >= 2 && !isFetching && !data?.vehicules?.length && !data?.clients?.length && !data?.documents?.length;

  return (
    <Dialog.Root open={ouverte} onOpenChange={(o) => !o && onFermer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(23_23_26/0.45)]" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-xl overflow-hidden border-trait bg-surface shadow-flottante lg:top-[12vh] lg:rounded-carte lg:border">
          <Dialog.Title className="sr-only">Recherche</Dialog.Title>
          <Dialog.Description className="sr-only">Rechercher un véhicule, un client ou un document</Dialog.Description>
          <Command shouldFilter={false} label="Recherche globale">
            <div className="flex items-center gap-2 border-b border-trait px-4">
              <MagnifyingGlass className="size-5 text-encre-3" aria-hidden />
              <Command.Input
                value={saisie}
                onValueChange={setSaisie}
                autoFocus
                placeholder="VIN, lot, client, téléphone, n° de facture…"
                className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-encre-3"
              />
              <button type="button" onClick={onFermer} className="text-[13px] text-encre-3 lg:hidden">Fermer</button>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              {q.length < 2 && <p className="px-3 py-6 text-center text-encre-3">Tapez au moins 2 caractères. Un bout de VIN suffit.</p>}
              {vide && <Command.Empty className="px-3 py-6 text-center text-encre-3">Aucun résultat pour « {q} ».</Command.Empty>}
              {!!data?.vehicules?.length && (
                <Command.Group heading="Véhicules" className="[&_[cmdk-group-heading]]:etiquette [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-encre-3">
                  {data.vehicules.map((v) => (
                    <Command.Item key={v.id} value={`v-${v.id}`} onSelect={() => onAller(`/parc/vehicule/?id=${v.id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-controle px-3 py-2.5 data-[selected=true]:bg-surface-2">
                      <Car className="size-4 shrink-0 text-encre-3" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{v.libelle || v.titre || [v.marque, v.modele, v.annee].filter(Boolean).join(" ") || v.reference}</span>
                        <span className="block truncate font-mono text-[12px] text-encre-3">{v.reference} · {grouperVin(v.vin)}</span>
                      </span>
                      {v.etape && <EtiquetteEtape etape={v.etape} compacte />}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {!!data?.clients?.length && (
                <Command.Group heading="Clients" className="[&_[cmdk-group-heading]]:etiquette [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-encre-3">
                  {data.clients.map((c) => (
                    <Command.Item key={c.id} value={`c-${c.id}`} onSelect={() => onAller(`/clients/fiche/?id=${c.id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-controle px-3 py-2.5 data-[selected=true]:bg-surface-2">
                      <User className="size-4 shrink-0 text-encre-3" aria-hidden />
                      <span className="flex-1 truncate font-medium">{c.nom}</span>
                      <span className="text-[13px] text-encre-3">{c.telephone}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {!!data?.documents?.length && (
                <Command.Group heading="Documents" className="[&_[cmdk-group-heading]]:etiquette [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-encre-3">
                  {data.documents.map((d) => (
                    <Command.Item key={d.id} value={`d-${d.id}`} onSelect={() => onAller(`/ventes/fiche/?id=${d.vente_id ?? d.id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-controle px-3 py-2.5 data-[selected=true]:bg-surface-2">
                      <FileText className="size-4 shrink-0 text-encre-3" aria-hidden />
                      <span className="font-mono text-[13px] font-medium">{d.numero}</span>
                      <span className="flex-1 truncate text-encre-2">{d.client}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
