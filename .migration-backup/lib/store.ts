import { create } from "zustand";
import type { Parametres } from "@/types";

interface AppStore {
  parametres: Parametres | null;
  setParametres: (parametres: Parametres) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  dataVersion: number;
  bumpDataVersion: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  parametres: null,
  setParametres: (parametres) => set({ parametres }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  dataVersion: 0,
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}));
