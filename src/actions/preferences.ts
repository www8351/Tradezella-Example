"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Persist the user's selected trading account (used across the dashboard). */
export async function setActiveAccount(accountId: string): Promise<void> {
  const store = await cookies();
  store.set("active_account", accountId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
