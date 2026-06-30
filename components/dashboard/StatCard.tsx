"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  bgColor: string;
  textColor: string;
  emoji?: string;
}

export function StatCard({ title, value, icon: Icon, href, bgColor, textColor, emoji }: StatCardProps) {
  const content = (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
      href && "cursor-pointer"
    )}>
      <CardContent className={cn("p-5", bgColor)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            {emoji && <span className="text-xl mb-2 block">{emoji}</span>}
            <p className={cn("text-3xl font-bold tabular-nums", textColor)}>{value}</p>
            <p className={cn("text-sm font-semibold mt-1 opacity-80", textColor)}>{title}</p>
          </div>
          <div className={cn("p-2 rounded-xl bg-white/30 backdrop-blur-sm flex-shrink-0")}>
            <Icon className={cn("w-6 h-6", textColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
