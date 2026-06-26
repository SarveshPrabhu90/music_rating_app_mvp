"use client";

import Link from "next/link";
import { useState } from "react";

import { AvatarChip } from "@/components/avatar-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FriendUser = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
};

type FriendshipBucket = {
  id: string;
  user: FriendUser;
};

type Props = {
  initialAccepted: FriendshipBucket[];
  initialIncoming: FriendshipBucket[];
  initialOutgoing: FriendshipBucket[];
};

export function FriendsManager({ initialAccepted, initialIncoming, initialOutgoing }: Props) {
  const [accepted, setAccepted] = useState(initialAccepted);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  async function patchFriendship(friendshipId: string, action: "accept" | "decline" | "remove" | "cancel") {
    const response = await fetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage(payload?.error?.message ?? "Could not update friendship.");
      return false;
    }

    return true;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Add a friend by username</p>
        <div className="flex gap-2">
          <Input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="friend-username" />
          <Button
            type="button"
            onClick={async () => {
              setMessage("");
              const response = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
              });
              const payload = await response.json().catch(() => null);
              if (!response.ok) {
                setMessage(payload?.error?.message ?? "Could not send friend request.");
                return;
              }
              setOutgoing((current) => [{ id: payload.data.id, user: payload.data.user }, ...current]);
              setUsername("");
              setMessage("Friend request sent.");
            }}
          >
            Send request
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Friends</h2>
        {accepted.length ? (
          accepted.map((friendship) => (
            <div key={friendship.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
              <div className="flex items-center gap-3">
                <AvatarChip name={friendship.user.name} username={friendship.user.username} size="sm" />
                <div>
                  <Link href={`/people/${friendship.user.username}`} className="font-medium hover:underline">
                    {friendship.user.name}
                  </Link>
                  <p className="text-sm text-zinc-500">@{friendship.user.username}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (await patchFriendship(friendship.id, "remove")) {
                    setAccepted((current) => current.filter((item) => item.id !== friendship.id));
                  }
                }}
              >
                Remove
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No friends yet.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Incoming requests</h2>
        {incoming.length ? (
          incoming.map((friendship) => (
            <div key={friendship.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
              <div className="flex items-center gap-3">
                <AvatarChip name={friendship.user.name} username={friendship.user.username} size="sm" />
                <div>
                  <p className="font-medium">{friendship.user.name}</p>
                  <p className="text-sm text-zinc-500">@{friendship.user.username}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    if (await patchFriendship(friendship.id, "accept")) {
                      setAccepted((current) => [{ ...friendship }, ...current]);
                      setIncoming((current) => current.filter((item) => item.id !== friendship.id));
                    }
                  }}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    if (await patchFriendship(friendship.id, "decline")) {
                      setIncoming((current) => current.filter((item) => item.id !== friendship.id));
                    }
                  }}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No incoming requests.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Sent requests</h2>
        {outgoing.length ? (
          outgoing.map((friendship) => (
            <div key={friendship.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
              <div className="flex items-center gap-3">
                <AvatarChip name={friendship.user.name} username={friendship.user.username} size="sm" />
                <div>
                  <p className="font-medium">{friendship.user.name}</p>
                  <p className="text-sm text-zinc-500">@{friendship.user.username}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (await patchFriendship(friendship.id, "cancel")) {
                    setOutgoing((current) => current.filter((item) => item.id !== friendship.id));
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No outgoing requests.</p>
        )}
      </section>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}