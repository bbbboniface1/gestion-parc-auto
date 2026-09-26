"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Eraser, ImageSquare, PenNib, Trash } from "@phosphor-icons/react";
import { useOrg } from "@/lib/session";
import { televerser, useUrlFichier } from "@/lib/stockage";
import { detourer } from "@/lib/image";
import { cn } from "@/lib/cn";
import { Bouton } from "@/components/ui/bouton";
import { Feuille } from "@/components/ui/feuille";

/** Aperçu sur damier : on voit tout de suite si le fond a bien été retiré. */
function Apercu({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  const url = useUrlFichier(path);
  return (
    <div className={cn("grid place-items-center overflow-hidden rounded-controle border border-trait", className)}
      style={{ backgroundImage: "linear-gradient(45deg, var(--surface-2) 25%, transparent 25%, transparent 75%, var(--surface-2) 75%), linear-gradient(45deg, var(--surface-2) 25%, transparent 25%, transparent 75%, var(--surface-2) 75%)", backgroundSize: "16px 16px", backgroundPosition: "0 0, 8px 8px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- export statique, URL signées */}
      {url ? <img src={url} alt={alt} className="max-h-full max-w-full object-contain p-2" /> : <span className="text-[12px] text-encre-3">Aucun</span>}
    </div>
  );
}

export function ChampImage({ libelle, aide, path, onChange, detourage, dossier = "entreprise", signature }: {
  libelle: string;
  aide?: string;
  path: string | null;
  onChange: (path: string | null) => void;
  /** Retire le fond clair (cachet, signature photographiés sur papier) */
  detourage?: boolean;
  dossier?: string;
  /** Propose aussi de signer au doigt */
  signature?: boolean;
}) {
  const org = useOrg();
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [pave, setPave] = useState(false);

  async function envoyer(blob: Blob, nom: string) {
    setEnvoi(true);
    try {
      const traite = detourage ? await detourer(blob) : blob;
      const fichier = new File([traite], nom, { type: traite.type || "image/png" });
      const { path: nouveau } = await televerser(org.id, dossier, fichier);
      onChange(nouveau);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setEnvoi(false);
      if (champ.current) champ.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-medium text-encre-2">{libelle}</p>
      <div className="flex items-center gap-3">
        <Apercu path={path} alt={libelle} className="h-24 w-36 shrink-0" />
        <div className="flex flex-col items-start gap-2">
          <Bouton taille="sm" icone={<ImageSquare className="size-4" />} chargement={envoi} onClick={() => champ.current?.click()}>
            {path ? "Remplacer" : "Choisir une image"}
          </Bouton>
          {signature && (
            <Bouton taille="sm" variante="fantome" icone={<PenNib className="size-4" />} onClick={() => setPave(true)}>Signer au doigt</Bouton>
          )}
          {path && (
            <Bouton taille="sm" variante="fantome" icone={<Trash className="size-4" />} onClick={() => onChange(null)}>Retirer</Bouton>
          )}
        </div>
      </div>
      {aide && <p className="text-[12px] text-encre-3">{aide}</p>}
      <input ref={champ} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void envoyer(f, f.name); }} />
      {signature && <PaveSignature ouvert={pave} onFermer={() => setPave(false)} onValider={(b) => { setPave(false); void envoyer(b, "signature.png"); }} />}
    </div>
  );
}

/** Pavé de signature : on signe au doigt ou au stylet, le tracé est exporté en PNG transparent. */
function PaveSignature({ ouvert, onFermer, onValider }: { ouvert: boolean; onFermer: () => void; onValider: (b: Blob) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [vide, setVide] = useState(true);
  const trace = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    const id = requestAnimationFrame(() => {
      const c = canvas.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      c.width = r.width * ratio;
      c.height = r.height * ratio;
      const ctx = c.getContext("2d")!;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1b2a4a"; // encre bleu-noir, comme un stylo
      setVide(true);
    });
    return () => cancelAnimationFrame(id);
  }, [ouvert]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <Feuille ouverte={ouvert} onFermer={onFermer} titre="Signer" description="Signez dans le cadre, au doigt ou au stylet."
      pied={<>
        <Bouton variante="secondaire" icone={<Eraser className="size-4" />} onClick={() => {
          const c = canvas.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          setVide(true);
        }}>Effacer</Bouton>
        <Bouton variante="primaire" disabled={vide} onClick={() => canvas.current?.toBlob((b) => b && onValider(b), "image/png")}>Valider</Bouton>
      </>}>
      <canvas
        ref={canvas}
        aria-label="Zone de signature"
        className="h-56 w-full touch-none rounded-controle border border-dashed border-trait-fort bg-white"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); trace.current = point(e); }}
        onPointerMove={(e) => {
          if (!trace.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(trace.current.x, trace.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          trace.current = p;
          setVide(false);
        }}
        onPointerUp={() => { trace.current = null; }}
        onPointerCancel={() => { trace.current = null; }}
      />
    </Feuille>
  );
}
