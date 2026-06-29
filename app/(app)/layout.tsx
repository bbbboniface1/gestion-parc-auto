import { Navigation } from "@/components/layout/Navigation";
import { ParametresLoader } from "@/components/layout/ParametresLoader";
import { DemoBanner } from "@/components/layout/DemoBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner />
      <ParametresLoader />
      <Navigation />
      {/* pt-14 = compense le header fixe mobile | md:ml-64 = compense la sidebar desktop */}
      <main className="pt-14 md:pt-0 md:ml-64 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
