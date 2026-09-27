import { cn } from "@/lib/cn";

const DEGRADES = [
  ["#8b5cf6", "#6d28d9"], ["#3b82f6", "#1d4ed8"], ["#14b8a6", "#0f766e"], ["#f59e0b", "#c2410c"],
  ["#ec4899", "#be185d"], ["#22c55e", "#15803d"], ["#0ea5e9", "#0369a1"], ["#f97316", "#c2410c"],
];

export function initiales(nom: string) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("");
}

/** Avatar d'une personne : ses initiales sur un dégradé tiré de son nom (toujours le même pour la même personne). */
export function Avatar({ nom, taille = 44, className }: { nom: string; taille?: number; className?: string }) {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = DEGRADES[h % DEGRADES.length]!;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white shadow-[0_6px_14px_-6px_rgb(15_23_42/0.45)]", className)}
      style={{ width: taille, height: taille, fontSize: taille * 0.36, background: `linear-gradient(145deg, ${a}, ${b})` }}>
      {initiales(nom)}
    </span>
  );
}
