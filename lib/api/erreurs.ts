// Les fonctions SQL lèvent des messages rédigés pour l'utilisateur final (« Accès refusé »,
// « Ce véhicule est déjà vendu »…). Tout autre message (technique, en anglais) est remplacé
// par un texte générique : on n'affiche jamais une trace Postgres à un client.

export class ErreurApi extends Error {
  readonly technique: string;
  readonly horsLigne: boolean;

  constructor(message: string, technique = message, horsLigne = false) {
    super(message);
    this.name = "ErreurApi";
    this.technique = technique;
    this.horsLigne = horsLigne;
  }
}

const TECHNIQUE = /violates|syntax|permission denied|does not exist|relation |function |column |invalid input|duplicate key|null value|Failed to fetch|NetworkError|JWT|PGRST|deadlock/i;

export function versErreurApi(erreur: unknown): ErreurApi {
  if (erreur instanceof ErreurApi) return erreur;
  const brut =
    erreur instanceof Error ? erreur.message
    : typeof erreur === "object" && erreur && "message" in erreur ? String((erreur as { message: unknown }).message)
    : String(erreur);

  if (/Failed to fetch|NetworkError|Load failed|network/i.test(brut) || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    return new ErreurApi("Pas de connexion. Réessayez dès le retour du réseau.", brut, true);
  }
  if (/JWT expired|refresh token|not authenticated|Non connecté/i.test(brut)) {
    return new ErreurApi("Votre session a expiré. Reconnectez-vous.", brut);
  }
  if (TECHNIQUE.test(brut) || brut.length > 240) {
    return new ErreurApi("Une erreur est survenue. Si elle persiste, contactez l'assistance.", brut);
  }
  return new ErreurApi(brut, brut);
}
