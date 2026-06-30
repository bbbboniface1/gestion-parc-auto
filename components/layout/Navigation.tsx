"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  TruckIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: HomeIcon,
  Car: TruckIcon,
  Package: ArchiveBoxIcon,
  Wallet: BanknotesIcon,
  Settings: Cog6ToothIcon,
  FileText: DocumentTextIcon,
};

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
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r z-40 shadow-sm">
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
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
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 min-h-12 group",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-primary"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 w-full min-h-12 transition-all duration-200 group"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ─── Header mobile (< md) ─── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b z-40 flex items-center justify-between px-4 shadow-sm">
        <span className="text-base font-bold text-primary">
          {getCurrentLabel(pathname)}
        </span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors active:scale-95"
          aria-label="Ouvrir le menu"
        >
          <Bars3Icon className="w-6 h-6 text-gray-700" />
        </button>
      </header>

      {/* ─── Drawer latéral mobile ─── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div>
                <h1 className="text-lg font-bold text-primary">🚗 Auto Mali</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Gestion de parc</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Fermer le menu"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
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
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 min-h-12",
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/25"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-500")} />
                    <span>{item.label}</span>
                    <span className="ml-auto text-lg">{item.emoji}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t">
              <button
                onClick={() => { setDrawerOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 w-full min-h-12 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Barre du bas mobile (< md) ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40 safe-area-bottom shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[52px] transition-all duration-200",
                  isActive ? "text-primary" : "text-gray-400"
                )}
              >
                <div className={cn(
                  "p-1 rounded-lg transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-gray-400")} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-tight transition-colors",
                  isActive ? "text-primary" : "text-gray-400"
                )}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
