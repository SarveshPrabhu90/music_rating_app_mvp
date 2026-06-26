"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AvatarChip } from "@/components/avatar-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  privacyDefault: string;
  relationship: "none" | "friends" | "incoming" | "outgoing";
  friendshipId: string | null;
};

export function PeopleDiscovery() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`/api/people/search${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!active) {
          return;
        }
        setResults(payload.data?.results ?? []);
      })
      .catch(() => {
        if (active) {
          setResults([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [query]);

  async function handleFriendAction(result: SearchResult) {
    setMessage("");

    if (result.relationship === "none") {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: result.username }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "Could not send friend request.");
        return;
      }
      setResults((current) =>
        current.map((item) =>
          item.id === result.id
            ? { ...item, relationship: "outgoing", friendshipId: payload.data?.id ?? item.friendshipId }
            : item,
        ),
      );
      return;
    }

    if (result.relationship === "incoming" && result.friendshipId) {
      const response = await fetch(`/api/friends/${result.friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!response.ok) {
        setMessage("Could not accept request.");
        return;
      }
      setResults((current) =>
        current.map((item) => (item.id === result.id ? { ...item, relationship: "friends" } : item)),
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[260px] flex-1 space-y-2 text-sm text-zinc-700">
          <span>Search people</span>
          <Input
            value={query}
            onChange={(event) => {
              setLoading(true);
              setQuery(event.target.value);
            }}
            placeholder="Search by name or username"
          />
        </label>
        {loading ? <p className="text-sm text-zinc-500">Searching…</p> : null}
      </div>

      <div className="space-y-3">
        {results.map((result) => (
          <div key={result.id} className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex min-w-0 gap-3">
              <AvatarChip name={result.name} username={result.username} />
              <div className="min-w-0">
                <Link href={`/people/${result.username}`} className="font-medium hover:underline">
                  {result.name}
                </Link>
                <p className="text-sm text-zinc-500">@{result.username} • {result.privacyDefault}</p>
                <p className="mt-1 text-sm text-zinc-700">{result.bio || "No bio yet."}</p>
              </div>
            </div>
            {result.relationship === "friends" ? (
              <Button type="button" variant="secondary" disabled>
                Friends
              </Button>
            ) : result.relationship === "outgoing" ? (
              <Button type="button" variant="secondary" disabled>
                Request sent
              </Button>
            ) : result.relationship === "incoming" ? (
              <Button type="button" onClick={() => handleFriendAction(result)}>
                Accept request
              </Button>
            ) : (
              <Button type="button" onClick={() => handleFriendAction(result)}>
                Add friend
              </Button>
            )}
          </div>
        ))}
        {!loading && !results.length ? <p className="text-sm text-zinc-500">No people found yet.</p> : null}
      </div>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}