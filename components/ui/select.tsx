import type { SelectHTMLAttributes } from "react";
import { clsx } from "clsx";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-300 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
