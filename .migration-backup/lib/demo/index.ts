const DEMO_MODE_KEY = "gestion-parc-auto-demo-mode";

export function isDemoMode(): boolean {
  // 1. Variable d'environnement (build-time, pour déploiement dédié demo)
  if (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") === true
  ) {
    return true;
  }

  // 2. Activation runtime via localStorage (bouton "Essayer la démo" sur la page connexion)
  if (typeof window !== "undefined") {
    return localStorage.getItem(DEMO_MODE_KEY) === "true";
  }

  return false;
}

export function activateDemoMode(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_MODE_KEY, "true");
  }
}

export function deactivateDemoMode(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEMO_MODE_KEY);
  }
}
