import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignalSlashIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-red-50 p-4">
      <Card className="w-full max-w-md text-center shadow-xl border-0">
        <CardContent className="p-10 space-y-5">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center shadow-inner">
            <SignalSlashIcon className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vous êtes hors ligne</h1>
            <p className="text-muted-foreground text-base mt-2">
              Vérifiez votre connexion internet, puis réessayez.
            </p>
          </div>
          <Button asChild className="w-full gap-2">
            <Link href="/dashboard">
              <ArrowPathIcon className="w-4 h-4" />
              Réessayer
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
