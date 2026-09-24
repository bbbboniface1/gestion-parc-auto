// Lien public de suivi d'un conteneur, par compagnie. Reconnaissance simple sur le nom
// (accents et casse ignorés) ; une compagnie non reconnue ne propose aucun lien plutôt
// qu'un lien qui ne mènerait nulle part.

const CONSTRUCTEURS: { motif: RegExp; url: (numero: string) => string }[] = [
  { motif: /msc/i, url: (n) => `https://www.msc.com/en/track-a-shipment?agencyPath=msc&trackingNumber=${n}` },
  { motif: /maersk/i, url: (n) => `https://www.maersk.com/tracking/${n}` },
  { motif: /cma.?cgm/i, url: (n) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=${n}` },
  { motif: /hapag/i, url: (n) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${n}` },
  { motif: /cosco/i, url: (n) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number=${n}` },
  { motif: /one\b|ocean network/i, url: (n) => `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?ContainerNumber=${n}` },
];

export function urlSuiviConteneur(compagnie: string | null | undefined, numeroConteneur: string | null | undefined): string | null {
  const numero = numeroConteneur?.trim().replace(/\s+/g, "");
  if (!compagnie || !numero) return null;
  const c = CONSTRUCTEURS.find((x) => x.motif.test(compagnie));
  return c ? c.url(encodeURIComponent(numero)) : null;
}
