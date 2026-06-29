"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Car, Package, Wallet, Settings, LogOut, FileText, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap = { Home, Car, Package, Wallet, Settings, FileText };

function getCurrentLabel(pathname: string) {
  const item = NAV_ITEMS.find((i) => pathname.startsWith(i.href));
  return item ? `${item.emoji} ${item.label}` : "🚗 Auto Mali";
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    router.push("/connexion");
    router.refresh();
  };

  return (
    <>
      {/* ─── Sidebar desktop (md+) ─── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r z-40">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary">🚗 Auto Mali</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion de parc</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-12",
                  isActive ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 w-full min-h-12"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ─── Header mobile (< md) ─── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b z-40 flex items-center justify-between px-4">
        <span className="text-base font-bold text-primary">
          {getCurrentLabel(pathname)}
        </span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* ─── Drawer latéral mobile ─── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h1 className="text-lg font-bold text-primary">🚗 Auto Mali</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Gestion de parc</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Fermer le menu"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-12",
                      isActive ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    <span className="ml-auto text-lg">{item.emoji}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t">
              <button
                onClick={() => { setDrawerOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 w-full min-h-12"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Barre du bas mobile (< md) ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[52px]",
                  isActive ? "text-primary" : "text-gray-400"
                )}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
