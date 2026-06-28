"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  bgColor: string;
  textColor: string;
  emoji?: string;
}

export function StatCard({ title, value, icon: Icon, href, bgColor, textColor, emoji }: StatCardProps) {
  const content = (
    <Card className={cn("overflow-hidden transition-transform hover:scale-[1.02]", href && "cursor-pointer")}>
      <CardContent className={cn("p-6", bgColor)}>
        <div className="flex items-start justify-between">
          <div>
            {emoji && <span className="text-2xl mb-2 block">{emoji}</span>}
            <p className={cn("text-4xl font-bold", textColor)}>{value}</p>
            <p className={cn("text-base font-medium mt-1", textColor)}>{title}</p>
          </div>
          <Icon size={32} className={textColor} />
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
