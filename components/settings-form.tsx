"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function SettingsForm({ initialPrivacy }: { initialPrivacy: string }) {
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-3">
      <Select value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
        <option value="private">Private by default</option>
        <option value="friends">Friends (coming soon)</option>
      </Select>
      <Button
        type="button"
        onClick={async () => {
          const response = await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ privacyDefault: privacy }),
          });
          setMessage(response.ok ? "Settings saved." : "Could not save settings.");
        }}
      >
        Save preference
      </Button>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
