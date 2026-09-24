import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Les quatre tailles du design (13 / 15 / 24 / 44 px) sont déclarées ici : sans cela, tailwind-merge prend
// « text-petit » pour une couleur et le supprime dès qu'une vraie couleur (« text-encre-3 ») le suit.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["petit", "corps", "titre", "chiffre"] }],
    },
  },
});

export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}
