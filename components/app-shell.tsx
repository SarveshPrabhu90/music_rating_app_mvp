"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

const links = [
  ["/dashboard", "Dashboard"],
  ["/feed", "Feed"],
  ["/diary", "Diary"],
  ["/library", "Library"],
  ["/friends", "Friends"],
  ["/profile", "Profile"],
  ["/pairwise", "Pairwise"],
  ["/taste-profile", "Taste"],
  ["/recommendations", "Recs"],
  ["/weekly-recap", "Recap"],
  ["/settings", "Settings"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f4ef] text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-[#f7f4ef]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide">
            Your taste, remembered.
          </Link>
          <div className="hidden gap-1 md:flex">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm hover:bg-zinc-200/70">
                {label}
              </Link>
            ))}
          </div>
          <Button variant="secondary" type="button" onClick={() => signOut({ callbackUrl: "/auth/login" })}>
            Logout
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-20 md:pb-6">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 gap-1 border-t border-zinc-200 bg-white p-2 md:hidden">
        {[links[0], links[1], links[2], links[4], links[5]].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-2 py-2 text-center text-xs hover:bg-zinc-100">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
