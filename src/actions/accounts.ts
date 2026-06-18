"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Account = Tables<"accounts">;

const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60),
  platform: z.enum([
    "generic",
    "binance",
    "coinbase",
    "bybit",
    "mt4",
    "mt5",
    "futures",
    "equity_broker",
  ]),
  assetClass: z.enum(["crypto", "cfd", "futures", "equity"]),
  currency: z
    .string()
    .trim()
    .length(3, "Use a 3-letter currency code.")
    .transform((s) => s.toUpperCase()),
  startingBalance: z.coerce.number().min(0),
  broker: z.string().trim().max(80).optional(),
});

export interface AccountResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** Create a trading account for the current user. */
export async function createAccount(
  formData: FormData,
): Promise<AccountResult> {
  const user = await requireUser();

  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    platform: formData.get("platform"),
    assetClass: formData.get("assetClass"),
    currency: formData.get("currency") || "USD",
    startingBalance: formData.get("startingBalance") || 0,
    broker: formData.get("broker") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      platform: parsed.data.platform,
      asset_class: parsed.data.assetClass,
      currency: parsed.data.currency,
      starting_balance: parsed.data.startingBalance,
      broker: parsed.data.broker ?? null,
    })
    .select("id")
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "You already have an account with that name."
        : error.message;
    return { ok: false, error: message };
  }

  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

/** List the current user's accounts (most recent first). */
export async function getAccounts(): Promise<Account[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}
