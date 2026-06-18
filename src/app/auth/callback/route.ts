import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-confirmation callback. Exchanges the `code` for a session,
 * then redirects to `next` (default /dashboard). Every failure path redirects
 * to /login with a readable message instead of throwing a 500.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const loginWithError = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  // The identity provider (Google/Supabase) bounced back an error.
  if (providerError) {
    return loginWithError(providerError);
  }

  // Env not configured on this deployment — fail readably, not with a 500.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return loginWithError(
      "Authentication is not configured yet. Please try again shortly.",
    );
  }

  if (!code) {
    return loginWithError("Missing authorization code. Please try again.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginWithError(error.message);
    }
  } catch {
    return loginWithError("Could not complete sign-in. Please try again.");
  }

  // Success — honor the Vercel forwarded host so prod redirects don't break.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  }
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
