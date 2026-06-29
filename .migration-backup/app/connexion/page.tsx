"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode, activateDemoMode } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Loader2, Play } from "lucide-react";

export default function ConnexionPage() {
  const [demoMode, setDemoMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Vérifier isDemoMode côté client uniquement (localStorage n'est pas dispo côté serveur)
  useEffect(() => {
    const demo = isDemoMode();
    setDemoMode(demo);
    if (demo) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleEnterDemo = () => {
    activateDemoMode();
    toast.success("Mode démo activé — données fictives dans votre navigateur");
    // Recharger pour que isDemoMode() soit bien lu partout
    window.location.href = "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Erreur de connexion : " + error.message);
      setIsLoading(false);
      return;
    }

    toast.success("Connexion réussie !");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🚗</div>
          <CardTitle className="text-2xl">Auto Mali Import</CardTitle>
          <p className="text-muted-foreground">Connectez-vous à votre compte</p>
          {demoMode && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mt-2">
              Mode démo : utilisez n&apos;importe quel email/mot de passe
            </p>
          )}
        </CardHeader>
        <CardContent>
          {/* Bouton démo — visible même si NEXT_PUBLIC_DEMO_MODE n'est pas défini */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 mb-3 font-medium">
              🧪 Vous voulez tester sans compte Supabase ?
            </p>
            <Button
              type="button"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleEnterDemo}
            >
              <Play size={16} className="mr-2" />
              Essayer en mode démo
            </Button>
            <p className="text-xs text-amber-700 mt-2 text-center">
              Données fictives enregistrées localement — aucun compte requis
            </p>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">ou se connecter</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <LogIn size={20} />
                  Se connecter
                </>
              )}
            </Button>
          </form>
          <p className="text-center mt-4 text-base">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="text-primary font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
