"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  timezone: z.string().trim().min(1, "Timezone is required.").max(64),
  baseCurrency: z
    .string()
    .trim()
    .length(3, "Use a 3-letter currency code.")
    .transform((s) => s.toUpperCase()),
});

export interface ProfileResult {
  ok: boolean;
  error?: string;
}

/** Update the current user's profile (timezone drives the PnL calendar). */
export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") || undefined,
    timezone: formData.get("timezone"),
    baseCurrency: formData.get("baseCurrency"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Validate the IANA timezone before persisting.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.timezone });
  } catch {
    return { ok: false, error: "Unknown timezone." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName ?? null,
      timezone: parsed.data.timezone,
      base_currency: parsed.data.baseCurrency,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
