import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("rounded-3xl border border-zinc-200 bg-white/80 p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}
