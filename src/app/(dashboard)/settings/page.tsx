import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone, base_currency")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>
          </p>
          <ProfileForm
            displayName={profile?.display_name ?? ""}
            timezone={profile?.timezone ?? "UTC"}
            baseCurrency={profile?.base_currency ?? "USD"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
