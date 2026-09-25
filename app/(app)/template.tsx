/** Chaque changement de page rejoue une arrivée douce (fondu, léger glissement). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="transition-page">{children}</div>;
}
