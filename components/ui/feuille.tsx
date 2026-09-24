"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOrdinateur } from "@/lib/ecran";

interface ProprietesFeuille {
  ouverte: boolean;
  onFermer: () => void;
  titre: ReactNode;
  description?: ReactNode;
  /** Barre d'action collée en bas (boutons Valider / Annuler) */
  pied?: ReactNode;
  children: ReactNode;
  /** Plein écran sur téléphone (formulaires longs) */
  pleinEcran?: boolean;
  largeur?: "md" | "lg" | "xl";
}

/**
 * Feuille : glisse depuis le bas sur téléphone (vaul), fenêtre centrée sur ordinateur (Radix).
 * Le pied reste visible au-dessus du clavier : l'action principale est toujours atteignable au pouce.
 */
export function Feuille({ ouverte, onFermer, titre, description, pied, children, pleinEcran, largeur = "md" }: ProprietesFeuille) {
  const ordinateur = useOrdinateur();

  if (ordinateur) {
    return (
      <Dialog.Root open={ouverte} onOpenChange={(o) => !o && onFermer()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(23_23_26/0.45)]" />
          <Dialog.Content
            className={cn(
              "fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-carte border border-trait bg-surface shadow-flottante",
              largeur === "md" && "max-w-lg",
              largeur === "lg" && "max-w-2xl",
              largeur === "xl" && "max-w-4xl",
            )}
          >
            <EnTete titre={titre} description={description} onFermer={onFermer} Titre={Dialog.Title} Description={Dialog.Description} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {pied && <div className="flex justify-end gap-2 border-t border-trait px-6 py-4">{pied}</div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer.Root open={ouverte} onOpenChange={(o) => !o && onFermer()} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[rgb(23_23_26/0.45)]" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-feuille border-t border-trait bg-surface outline-none",
            pleinEcran ? "h-[96dvh]" : "max-h-[92dvh]",
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-trait-fort" />
          <EnTete titre={titre} description={description} onFermer={onFermer} Titre={Drawer.Title} Description={Drawer.Description} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-4">{children}</div>
          {pied && <div className="zone-sure-bas flex gap-2 border-t border-trait bg-surface px-4 pt-3 pb-3 [&>*]:flex-1">{pied}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function EnTete({ titre, description, onFermer, Titre, Description }: {
  titre: ReactNode;
  description?: ReactNode;
  onFermer: () => void;
  Titre: typeof Dialog.Title;
  Description: typeof Dialog.Description;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 lg:px-6 lg:pt-5">
      <div className="min-w-0">
        <Titre className="text-titre font-semibold tracking-tight text-encre lg:text-titre">{titre}</Titre>
        {description ? (
          <Description className="mt-0.5 text-petit text-encre-3">{description}</Description>
        ) : (
          <Description className="sr-only">{typeof titre === "string" ? titre : "Fenêtre"}</Description>
        )}
      </div>
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-controle text-encre-3 hover:bg-surface-2 hover:text-encre lg:size-9"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
