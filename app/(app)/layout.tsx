import { Navigation } from "@/components/layout/Navigation";
import { ParametresLoader } from "@/components/layout/ParametresLoader";
import { DemoBanner } from "@/components/layout/DemoBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner />
      <ParametresLoader />
      <Navigation />
      <main className="md:ml-64 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
