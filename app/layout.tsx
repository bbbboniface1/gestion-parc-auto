import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { OnlineIndicator } from "@/components/layout/OnlineIndicator";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Gestion Parc Auto — Mali Import",
  description: "Application de gestion de parc automobile — Voitures importées USA vers Mali",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Auto Mali",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <OnlineIndicator />
        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
