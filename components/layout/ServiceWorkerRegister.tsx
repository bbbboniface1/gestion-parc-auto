"use client";

import { useEffect } from "react";
import { isDemoMode } from "@/lib/demo";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const shouldRegister =
      process.env.NODE_ENV === "production" && !isDemoMode();

    if (!shouldRegister) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker optionnel
    });
  }, []);

  return null;
}
