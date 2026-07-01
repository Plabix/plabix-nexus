import type { Metadata } from "next";

import { SettingsTabs } from "@/components/dashboard/settings/settings-tabs";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id)
    .single();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization, API access, and appearance.
        </p>
      </div>
      <SettingsTabs organizationName={organization?.name ?? ""} role={profile.role} />
    </div>
  );
}
