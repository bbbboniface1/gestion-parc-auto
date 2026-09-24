// Envoi par WhatsApp sans aucune API payante : lien wa.me avec message prérempli,
// et partage direct du PDF quand le téléphone le permet (Android : feuille de partage).

/**
 * Numéro international sans « + » ni espaces. Un numéro malien local compte 8 chiffres ;
 * on lui ajoute l'indicatif 223.
 */
export function numeroInternational(telephone: string | null | undefined, indicatif = "223"): string | null {
  if (!telephone) return null;
  let chiffres = telephone.replace(/[^\d+]/g, "");
  if (chiffres.startsWith("+")) chiffres = chiffres.slice(1);
  else if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  chiffres = chiffres.replace(/\D/g, "");
  if (chiffres.length === 8) chiffres = `${indicatif}${chiffres}`;
  return chiffres.length >= 10 && chiffres.length <= 15 ? chiffres : null;
}

/** Remplace {client}, {numero}, {montant}… ; une variable inconnue reste visible pour être corrigée. */
export function remplirModele(modele: string, valeurs: Record<string, string | number | null | undefined>): string {
  return modele.replace(/\{(\w+)\}/g, (brut, cle: string) => {
    const v = valeurs[cle];
    return v === null || v === undefined || v === "" ? brut : String(v);
  });
}

export function lienWhatsApp(telephone: string | null | undefined, message: string): string {
  const numero = numeroInternational(telephone);
  const texte = encodeURIComponent(message);
  return numero ? `https://wa.me/${numero}?text=${texte}` : `https://wa.me/?text=${texte}`;
}

/** Tente le partage natif d'un fichier (PDF) ; renvoie false si le navigateur ne sait pas le faire. */
export async function partagerFichier(fichier: File, titre: string, texte: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  if (!navigator.canShare({ files: [fichier] })) return false;
  try {
    await navigator.share({ files: [fichier], title: titre, text: texte });
    return true;
  } catch (erreur) {
    // L'utilisateur a fermé la feuille de partage : ce n'est pas un échec.
    return erreur instanceof DOMException && erreur.name === "AbortError";
  }
}
