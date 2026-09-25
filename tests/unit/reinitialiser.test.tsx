import { describe, expect, it } from "vitest";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import { useAuChangement } from "@/lib/reinitialiser";

// Le rendu serveur exécute les mises à jour d'état faites pendant le rendu, comme le navigateur : de quoi vérifier
// que l'initialisation se rejoue au premier rendu et ne boucle pas.

function Feuille({ ouverte, prefixe = "" }: { ouverte: boolean; prefixe?: string }) {
  const [nom, setNom] = useState("brouillon");
  const [rendus, setRendus] = useState(0);
  useAuChangement([ouverte], () => {
    if (ouverte) { setNom(`${prefixe}vierge`); setRendus((n) => n + 1); }
  });
  return <span data-nom={nom} data-rendus={rendus} />;
}

describe("useAuChangement", () => {
  it("rejoue l'initialisation au premier rendu quand la feuille est déjà ouverte", () => {
    const html = renderToString(<Feuille ouverte />);
    expect(html).toContain('data-nom="vierge"');
  });

  it("ne touche à rien quand la condition de l'initialisation n'est pas remplie", () => {
    const html = renderToString(<Feuille ouverte={false} />);
    expect(html).toContain('data-nom="brouillon"');
  });

  it("ne boucle pas : l'initialisation ne se rejoue qu'une fois pour des dépendances inchangées", () => {
    const html = renderToString(<Feuille ouverte />);
    expect(html).toContain('data-rendus="1"');
  });

  it("lit les valeurs du rendu courant dans l'initialisation", () => {
    expect(renderToString(<Feuille ouverte prefixe="x-" />)).toContain('data-nom="x-vierge"');
  });

  it("accepte des dépendances de longueurs différentes sans boucler", () => {
    function Variable({ n }: { n: number }) {
      const [v, setV] = useState(0);
      useAuChangement(Array.from({ length: n }, (_, i) => i), () => setV((x) => x + 1));
      return <span data-v={v} />;
    }
    expect(renderToString(<Variable n={3} />)).toContain('data-v="1"');
  });
});
