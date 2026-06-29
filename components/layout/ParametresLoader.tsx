"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";

export function ParametresLoader() {
  const setParametres = useAppStore((s) => s.setParametres);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const supabase = createClient();
    supabase
      .from("parametres")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setParametres(data);
      });
  }, [setParametres]);

  return null;
}
