"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";

export function ParametresLoader() {
  const parametres = useAppStore((s) => s.parametres);
  const setParametres = useAppStore((s) => s.setParametres);

  useEffect(() => {
    if (parametres) return;

    const supabase = createClient();
    supabase
      .from("parametres")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setParametres(data);
      });
  }, [parametres, setParametres]);

  return null;
}
