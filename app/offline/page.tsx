import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8 space-y-4">
          <WifiOff size={48} className="mx-auto text-red-500" />
          <h1 className="text-2xl font-bold">Vous êtes hors ligne</h1>
          <p className="text-muted-foreground text-base">
            Vérifiez votre connexion internet, puis réessayez.
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard">Réessayer</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
