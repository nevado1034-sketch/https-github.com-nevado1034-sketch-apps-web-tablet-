import React, { useEffect, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const BLOCK_KEYS = ["c", "x", "u", "s", "p", "a"];

export default function CopyProtected({ children }: Props) {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12" || e.key === "PrintScreen") e.preventDefault();
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (BLOCK_KEYS.includes(k) || e.shiftKey)) e.preventDefault();
    };

    const onClip = (e: ClipboardEvent) => e.preventDefault();
    const onSelect = (e: Event) => e.preventDefault();

    document.addEventListener("contextmenu", prevent);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("copy", onClip);
    document.addEventListener("cut", onClip);
    document.addEventListener("selectstart", onSelect);
    document.addEventListener("dragstart", prevent);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("copy", onClip);
      document.removeEventListener("cut", onClip);
      document.removeEventListener("selectstart", onSelect);
      document.removeEventListener("dragstart", prevent);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans select-none">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -inset-[50%] rotate-[-24deg] grid grid-cols-3 gap-x-10 gap-y-16 opacity-[0.045]">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="whitespace-nowrap text-4xl font-black tracking-[0.3em] text-cyan-400">
              LITIO ENERGY
            </span>
          ))}
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}