import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user (validated against the Supabase Auth server,
 * not just decoded from the cookie), or null. Memoized per request render.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Like {@link getUser} but redirects to /login when unauthenticated.
 * Use this as the secure auth gate inside Server Components and Actions.
 */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});
