import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10">
      <section className="space-y-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-violet-600">Private music taste graph</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
          Rank what actually mattered.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-700">
          Streaming history shows what played. This shows what stayed. Log songs, calibrate your taste, and get
          recommendations from what you explicitly loved.
        </p>
        <div className="flex gap-3">
          <Link href="/auth/signup" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-zinc-50">
            Create account
          </Link>
          <Link href="/auth/login" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium">
            Login
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Diary entry</p>
          <h3 className="mt-2 text-lg font-semibold">Midnight Sketch — Nova Arcade</h3>
          <p className="mt-2 text-sm text-zinc-600">The bridge felt like driving home at 2am.</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Taste profile</p>
          <h3 className="mt-2 text-lg font-semibold">Current sound: Nostalgic alt-pop</h3>
          <p className="mt-2 text-sm text-zinc-600">Anchors: Midnight Sketch, Stereo Bloom, Painted Exit.</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Weekly recap</p>
          <h3 className="mt-2 text-lg font-semibold">Your week sounded like late-night synth glow.</h3>
          <p className="mt-2 text-sm text-zinc-600">Top mood: nostalgia • Top genre: synth pop</p>
        </Card>
      </section>
    </div>
  );
}
