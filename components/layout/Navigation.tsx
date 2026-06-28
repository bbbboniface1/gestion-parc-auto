"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Car, Package, Wallet, Settings, LogOut, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap = {
  Home,
  Car,
  Package,
  Wallet,
  Settings,
  FileText,
};

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    router.push("/connexion");
    router.refresh();
  };

  return (
    <>
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r z-40">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary">🚗 Auto Mali</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion de parc</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-1 min-w-[60px]",
                  isActive ? "text-primary" : "text-gray-500"
                )}
              >
                <Icon size={22} />
                <span className="text-xs font-medium">{item.emoji}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
