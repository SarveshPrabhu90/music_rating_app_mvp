import { SettingsForm } from "@/components/settings-form";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function SettingsPage() {
  const user = await requireUser();

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, privacyDefault: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <Card className="space-y-3">
        <p className="text-sm text-zinc-600">
          Profile: {profile?.name} • {profile?.email}
        </p>
        <SettingsForm initialPrivacy={profile?.privacyDefault ?? "private"} />
        <p className="text-sm text-zinc-500">Spotify / Apple Music connection coming soon.</p>
      </Card>
    </div>
  );
}
