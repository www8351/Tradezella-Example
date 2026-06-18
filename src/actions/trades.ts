"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Update the free-text notes on a trade (RLS scopes to the owner). */
export async function updateTradeNotes(
  tradeId: string,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  if (!z.string().uuid().safeParse(tradeId).success) {
    return { ok: false, error: "Invalid trade." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trades")
    .update({ notes: notes.slice(0, 5000) })
    .eq("id", tradeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/trades/${tradeId}`);
  return { ok: true };
}
