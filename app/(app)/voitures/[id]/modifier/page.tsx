"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Voiture } from "@/types";
import { VoitureForm } from "@/components/voitures/VoitureForm";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ModifierVoiturePage() {
  const params = useParams();
  const router = useRouter();
  const [voiture, setVoiture] = useState<Voiture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadVoiture() {
      const { data, error } = await supabase
        .from("voitures")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        toast.error("Voiture introuvable");
        router.push("/voitures");
        return;
      }
      setVoiture(data);
      setIsLoading(false);
    }
    loadVoiture();
  }, [params.id, supabase, router]);

  if (isLoading || !voiture) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/voitures/${voiture.id}`}>
            <ArrowLeft size={18} />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">✏️ Modifier la voiture</h1>
          <p className="text-muted-foreground mt-1">
            {voiture.marque} {voiture.modele} {voiture.annee}
          </p>
        </div>
      </div>
      <VoitureForm
        voiture={voiture}
        onSuccess={(updated) => router.push(`/voitures/${updated.id}`)}
      />
    </div>
  );
}
