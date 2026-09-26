"use client";

import type { ReactNode } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export interface EntreeMenu {
  libelle: string;
  icone?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  masque?: boolean;
}

/** Menu d'actions secondaires : clavier, lecteur d'écran et toucher gérés par Radix. */
export function MenuActions({ declencheur, entrees, aligne = "end" }: { declencheur: ReactNode; entrees: EntreeMenu[]; aligne?: "start" | "end" }) {
  const visibles = entrees.filter((e) => !e.masque);
  if (visibles.length === 0) return null;
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>{declencheur}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align={aligne} sideOffset={8}
          className="z-50 min-w-56 carte p-1 shadow-flottante">
          {visibles.map((e) => (
            <Menu.Item key={e.libelle} onSelect={e.onSelect}
              className={cn("flex h-11 cursor-pointer items-center gap-3 rounded-controle px-3 text-[16px] outline-none select-none data-[highlighted]:bg-surface-2 lg:h-10 lg:text-[14px]",
                e.danger ? "text-perte-texte" : "text-encre")}>
              {e.icone}
              {e.libelle}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
