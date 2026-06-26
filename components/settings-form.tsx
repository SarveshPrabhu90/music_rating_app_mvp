"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function SettingsForm({ initialPrivacy }: { initialPrivacy: string }) {
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  return (
    <div className="space-y-3">
      <Select value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
        <option value="private">Private by default</option>
        <option value="friends">Friends only</option>
        <option value="public">Public</option>
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
      <div className="space-y-2 border-t border-zinc-200 pt-4">
        <p className="text-sm font-medium text-zinc-800">Privacy controls</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              setMessage("");

              const response = await fetch("/api/settings/export", { method: "GET" });
              if (!response.ok) {
                setMessage("Could not export your data.");
                setExporting(false);
                return;
              }

              const payload = await response.json();
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "music-diary-export.json";
              anchor.click();
              URL.revokeObjectURL(url);

              setMessage("Your export is downloading.");
              setExporting(false);
            }}
          >
            {exporting ? "Preparing export..." : "Export my data"}
          </Button>
        </div>
        <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-medium text-rose-900">Delete account</p>
          <p className="text-sm text-rose-700">Type DELETE to permanently remove your account and all associated diary, ranking, and recap data.</p>
          <input
            className="w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="Type DELETE"
          />
          <Button
            type="button"
            disabled={deleting || deleteConfirmation !== "DELETE"}
            onClick={async () => {
              setDeleting(true);
              setMessage("");

              const response = await fetch("/api/settings/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: deleteConfirmation }),
              });

              if (!response.ok) {
                setMessage("Could not delete account.");
                setDeleting(false);
                return;
              }

              await signOut({ callbackUrl: "/auth/signup" });
            }}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {deleting ? "Deleting..." : "Delete my account"}
          </Button>
        </div>
      </div>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
