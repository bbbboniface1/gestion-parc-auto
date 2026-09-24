"use client";

// Lectures et écritures de l'interface, au-dessus de `rpc`.
// - Lecture « hors ligne d'abord » : le dernier résultat connu s'affiche immédiatement,
//   y compris sans réseau (cache persistant dans IndexedDB), puis se met à jour.
// - Écriture : si le réseau manque, l'opération est mise en attente et part toute seule
//   au retour de la connexion, même après fermeture de l'app (les créations sont
//   idempotentes côté serveur grâce à l'`id` généré ici).

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { rpc, modeActuel } from "./client";
import type { ErreurApi } from "./erreurs";

export type Params = Record<string, unknown>;

interface VariablesEcriture {
  fonction: string;
  params: Params;
}

export function cleRequete(fonction: string, params: Params = {}) {
  return ["api", modeActuel(), fonction, params] as const;
}

export function creerClientRequetes(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: "offlineFirst",
        staleTime: 20_000,
        gcTime: 7 * 24 * 3600_000,
        retry: (tentatives, erreur) => !(erreur as ErreurApi).horsLigne && tentatives < 1,
        refetchOnWindowFocus: true,
      },
      mutations: {
        networkMode: "online",
        retry: 0,
      },
    },
  });
  // Nécessaire pour reprendre, après un redémarrage, les écritures mises en attente hors ligne.
  client.setMutationDefaults(["api"], {
    mutationFn: ({ fonction, params }: VariablesEcriture) => rpc(fonction, params),
  });
  return client;
}

export const persisteur = createAsyncStoragePersister({
  storage: typeof window === "undefined" ? undefined : { getItem: get, setItem: set, removeItem: del },
  key: "parc-auto:cache",
  throttleTime: 1000,
});

export function useLecture<T>(
  fonction: string,
  params: Params,
  options: Omit<UseQueryOptions<T, ErreurApi, T, ReturnType<typeof cleRequete>>, "queryKey" | "queryFn"> = {},
) {
  return useQuery<T, ErreurApi, T, ReturnType<typeof cleRequete>>({
    queryKey: cleRequete(fonction, params),
    queryFn: () => rpc<T>(fonction, params),
    ...options,
  });
}

/** Identifiant généré sur l'appareil : rend la création rejouable sans doublon. */
export function nouvelId(): string {
  return crypto.randomUUID();
}

export function useEcriture<TResultat = unknown>(
  fonction: string,
  options: { onSuccess?: (resultat: TResultat, params: Params) => void; onError?: (e: ErreurApi) => void } = {},
) {
  const client = useQueryClient();
  const mutation = useMutation<TResultat, ErreurApi, VariablesEcriture>({
    mutationKey: ["api", fonction],
    mutationFn: ({ params }) => rpc<TResultat>(fonction, params),
    onSuccess: async (resultat, { params }) => {
      // Une écriture peut changer n'importe quel écran (indicateurs, listes, fiches) :
      // on invalide tout ; seules les requêtes affichées se rechargent.
      await client.invalidateQueries({ queryKey: ["api"] });
      options.onSuccess?.(resultat, params);
    },
    onError: options.onError,
  });
  return {
    ...mutation,
    executer: (params: Params) => mutation.mutate({ fonction, params }),
    executerAsync: (params: Params) => mutation.mutateAsync({ fonction, params }),
  };
}
