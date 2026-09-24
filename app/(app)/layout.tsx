import { Coque } from "@/components/coque/coque";
import { GardeSession } from "@/components/coque/garde-session";

export default function EspaceTravailLayout({ children }: { children: React.ReactNode }) {
  return (
    <GardeSession>
      <Coque>{children}</Coque>
    </GardeSession>
  );
}
