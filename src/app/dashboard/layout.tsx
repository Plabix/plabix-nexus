import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id)
    .single();

  const organizationName = organization?.name ?? "Your organization";

  return (
    <DashboardShell
      organizationName={organizationName}
      userName={profile.full_name ?? ""}
      userEmail={user.email ?? ""}
    >
      {children}
    </DashboardShell>
  );
}
