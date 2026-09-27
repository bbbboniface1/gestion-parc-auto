import { cn } from "@/lib/cn";

const TEINTES = Array.from({ length: 8 }, (_, i) => `var(--avatar-${i + 1})`);

export function initiales(nom: string) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("");
}

/** Avatar d'une personne : ses initiales sur une teinte unie tirée de son nom (toujours la même pour la même personne). */
export function Avatar({ nom, taille = 44, className }: { nom: string; taille?: number; className?: string }) {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const fond = TEINTES[h % TEINTES.length]!;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white", className)}
      style={{ width: taille, height: taille, fontSize: taille >= 72 ? 24 : taille >= 48 ? 18 : taille >= 40 ? 16 : taille >= 32 ? 14 : 12, background: fond }}>
      {initiales(nom)}
    </span>
  );
}
