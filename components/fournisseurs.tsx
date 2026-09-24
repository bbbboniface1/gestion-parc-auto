"use client";

import { useState, type ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "sonner";
import { creerClientRequetes, persisteur } from "@/lib/api/requetes";
import { VERSION } from "@/lib/config";
import { FournisseurSession } from "@/lib/session";
import { EnregistrementServiceWorker } from "./service-worker";

export function Fournisseurs({ children }: { children: ReactNode }) {
  const [client] = useState(creerClientRequetes);
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister: persisteur, maxAge: 7 * 24 * 3600_000, buster: VERSION }}
      // Les écritures faites hors ligne et restées en attente repartent au redémarrage.
      onSuccess={() => void client.resumePausedMutations()}
    >
      <FournisseurSession>{children}</FournisseurSession>
      <EnregistrementServiceWorker />
      <Toaster
        position="top-center"
        offset={16}
        toastOptions={{
          classNames: {
            toast: "!rounded-carte !border !border-trait !bg-surface !text-encre !shadow-flottante !font-sans",
            description: "!text-encre-2",
            actionButton: "!bg-laterite !text-sur-laterite",
          },
        }}
      />
    </PersistQueryClientProvider>
  );
}
