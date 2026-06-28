"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Loader2, Play } from "lucide-react";

export default function ConnexionPage() {
  const demoMode = isDemoMode();
  const [email, setEmail] = useState(demoMode ? "demo@automali.ml" : "");
  const [password, setPassword] = useState(demoMode ? "demo123456" : "");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (demoMode) {
      router.replace("/dashboard");
    }
  }, [demoMode, router]);

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
          {demoMode && (
            <Button
              type="button"
              className="w-full mb-4"
              variant="secondary"
              onClick={() => {
                toast.success("Mode démo activé !");
                router.push("/dashboard");
              }}
            >
              <Play size={20} />
              Entrer en mode démo (sans connexion)
            </Button>
          )}
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
