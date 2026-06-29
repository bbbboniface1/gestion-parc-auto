"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA } from "@/lib/utils";

interface GraphiqueVentesProps {
  data: { mois: string; montant: number; count: number }[];
}

export function GraphiqueVentes({ data }: GraphiqueVentesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Ventes des 6 derniers mois</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune vente enregistrée</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(value: number) => [formatFCFA(value), "Montant"]}
                labelFormatter={(label) => `Mois : ${label}`}
              />
              <Bar dataKey="montant" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
