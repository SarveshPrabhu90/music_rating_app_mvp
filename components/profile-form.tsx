"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  initialProfile: {
    username: string;
    name: string;
    bio: string | null;
    privacyDefault: string;
  };
};

export function ProfileForm({ initialProfile }: Props) {
  const [form, setForm] = useState({
    username: initialProfile.username,
    name: initialProfile.name,
    bio: initialProfile.bio ?? "",
    privacyDefault: initialProfile.privacyDefault,
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium">Display name</p>
        <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Username</p>
        <Input
          value={form.username}
          onChange={(event) =>
            setForm((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))
          }
        />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Bio</p>
        <Textarea
          rows={4}
          value={form.bio}
          onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
          placeholder="What should people know about your taste?"
        />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Visibility</p>
        <Select
          value={form.privacyDefault}
          onChange={(event) => setForm((current) => ({ ...current, privacyDefault: event.target.value }))}
        >
          <option value="private">Private</option>
          <option value="friends">Friends only</option>
          <option value="public">Public</option>
        </Select>
      </div>
      <Button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setMessage("");
          const response = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const payload = await response.json().catch(() => null);
          setSaving(false);
          setMessage(response.ok ? "Profile updated." : payload?.error?.message ?? "Could not update profile.");
        }}
      >
        {saving ? "Saving..." : "Save profile"}
      </Button>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}