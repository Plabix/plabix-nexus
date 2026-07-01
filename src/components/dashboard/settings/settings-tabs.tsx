"use client";

import { ApiKeysSettings } from "@/components/dashboard/settings/api-keys-settings";
import { AppearanceSettings } from "@/components/dashboard/settings/appearance-settings";
import { OrganizationSettings } from "@/components/dashboard/settings/organization-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MemberRole } from "@/types/database";

export function SettingsTabs({
  organizationName,
  role,
}: {
  organizationName: string;
  role: MemberRole;
}) {
  return (
    <Tabs defaultValue="organization" className="gap-6">
      <TabsList>
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="api-keys">API keys</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>
      <TabsContent value="organization" className="flex flex-col gap-6">
        <OrganizationSettings initialName={organizationName} role={role} />
      </TabsContent>
      <TabsContent value="api-keys" className="flex flex-col gap-6">
        <ApiKeysSettings role={role} />
      </TabsContent>
      <TabsContent value="appearance" className="flex flex-col gap-6">
        <AppearanceSettings />
      </TabsContent>
    </Tabs>
  );
}
