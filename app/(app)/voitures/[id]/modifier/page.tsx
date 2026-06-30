"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Voiture } from "@/types";
import { VoitureForm } from "@/components/voitures/VoitureForm";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

export default function ModifierVoiturePage() {
  const params = useParams();
  const router = useRouter();
  const [voiture, setVoiture] = useState<Voiture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function loadVoiture() {
      const supabase = createClient();
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
  }, [params.id, router]);

  if (isLoading || !voiture) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link href={`/voitures/${voiture.id}`}>
            <ArrowLeftIcon className="w-4 h-4" />Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">✏️ Modifier la voiture</h1>
          <p className="text-muted-foreground mt-1">{voiture.marque} {voiture.modele} {voiture.annee}</p>
        </div>
      </div>
      <VoitureForm voiture={voiture} onSuccess={(updated) => router.push(`/voitures/${updated.id}`)} />
    </div>
  );
}
