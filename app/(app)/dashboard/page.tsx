"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DashboardStats, Voiture } from "@/types";
import { StatCard } from "@/components/dashboard/StatCard";
import { GraphiqueVentes } from "@/components/dashboard/GraphiqueVentes";
import { VoitureCard } from "@/components/voitures/VoitureCard";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA, formatUSD, isVenteActive } from "@/lib/utils";
import {
  Package,
  Truck,
  Anchor,
  Warehouse,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useAppStore } from "@/lib/store";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVoitures, setRecentVoitures] = useState<Voiture[]>([]);
  const [chartData, setChartData] = useState<{ mois: string; montant: number; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const dataVersion = useAppStore((s) => s.dataVersion);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, voituresRes, ventesRes] = await Promise.all([
          supabase.from("dashboard_stats").select("*").single(),
          supabase.from("voitures").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("ventes").select("prix_vente_fcfa, date_vente, status").gte(
            "date_vente",
            format(subMonths(new Date(), 6), "yyyy-MM-dd")
          ),
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (voituresRes.data) setRecentVoitures(voituresRes.data);

        if (ventesRes.data) {
          const months: Record<string, { montant: number; count: number }> = {};
          for (let i = 5; i >= 0; i--) {
            const d = startOfMonth(subMonths(new Date(), i));
            const key = format(d, "MMM yyyy", { locale: fr });
            months[key] = { montant: 0, count: 0 };
          }
          ventesRes.data.filter(isVenteActive).forEach((v) => {
            const key = format(new Date(v.date_vente), "MMM yyyy", { locale: fr });
            if (months[key]) {
              months[key].montant += v.prix_vente_fcfa;
              months[key].count += 1;
            }
          });
          setChartData(
            Object.entries(months).map(([mois, data]) => ({ mois, ...data }))
          );
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [supabase, dataVersion]);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">🏠 Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d&apos;ensemble de votre parc automobile</p>
      </div>

      {/* Statistiques voitures */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Commandées"
          value={stats?.total_commandes ?? 0}
          icon={Package}
          href="/voitures?statut=commande"
          bgColor="bg-gray-100"
          textColor="text-gray-600"
          emoji="🟡"
        />
        <StatCard
          title="En route"
          value={stats?.total_en_transit ?? 0}
          icon={Truck}
          href="/voitures?statut=en_transit"
          bgColor="bg-blue-100"
          textColor="text-blue-700"
          emoji="🔵"
        />
        <StatCard
          title="Au port"
          value={stats?.total_arrivees ?? 0}
          icon={Anchor}
          href="/voitures?statut=arrivee"
          bgColor="bg-purple-100"
          textColor="text-purple-700"
          emoji="🟣"
        />
        <StatCard
          title="En stock"
          value={stats?.total_en_stock ?? 0}
          icon={Warehouse}
          href="/stock"
          bgColor="bg-green-100"
          textColor="text-green-700"
          emoji="🟢"
        />
        <StatCard
          title="Vendues"
          value={stats?.total_vendues ?? 0}
          icon={CheckCircle}
          href="/voitures?statut=vendue"
          bgColor="bg-orange-100"
          textColor="text-orange-700"
          emoji="🟠"
        />
      </div>

      {/* Finances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="text-emerald-600" size={28} />
              <div>
                <p className="text-sm text-muted-foreground">💵 Payé aux USA</p>
                <p className="text-xl font-bold">{formatUSD(stats?.montant_paye_usa ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600" size={28} />
              <div>
                <p className="text-sm text-muted-foreground">🔴 Reste à payer USA</p>
                <p className="text-xl font-bold">{formatUSD(stats?.montant_du_usa ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Wallet className="text-green-600" size={28} />
              <div>
                <p className="text-sm text-muted-foreground">💚 Encaissé au Mali</p>
                <p className="text-xl font-bold">{formatFCFA(stats?.total_encaisse_fcfa ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600" size={28} />
              <div>
                <p className="text-sm text-muted-foreground">⚠️ Reste à encaisser</p>
                <p className="text-xl font-bold">{formatFCFA(Math.max(0, stats?.total_restant_fcfa ?? 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <GraphiqueVentes data={chartData} />

      {/* Dernières voitures */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">🚗 Dernières voitures ajoutées</h2>
          <Link href="/voitures" className="text-primary font-medium hover:underline">
            Voir toutes →
          </Link>
        </div>
        {recentVoitures.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Aucune voiture enregistrée</p>
              <Link href="/voitures/ajouter" className="text-primary font-medium hover:underline">
                + Ajouter votre première voiture
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentVoitures.map((v) => (
              <VoitureCard key={v.id} voiture={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
