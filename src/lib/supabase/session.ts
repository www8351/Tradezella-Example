import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

/** Route prefixes that require an authenticated user. */
const PROTECTED_PREFIXES = ["/dashboard"];
/** Routes an authenticated user should be bounced away from. */
const AUTH_ROUTES = ["/login"];

/**
 * Refreshes the Supabase auth session on every request and performs an
 * *optimistic* redirect (cookie-only check — no DB calls), per the Next.js 16
 * Proxy guidance. Real authorization still happens in Server Components /
 * Actions via `supabase.auth.getUser()`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If the Supabase env vars aren't configured (e.g. before they're added in
  // Vercel), degrade gracefully to "logged out" instead of throwing 500s on
  // every route. Protected routes still redirect to /login below.
  if (!supabaseUrl || !supabaseKey) {
    const { pathname } = request.nextUrl;
    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: do not run logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    return redirectPreservingCookies(request, supabaseResponse, "/login", {
      redirect: pathname,
    });
  }

  if (user && isAuthRoute) {
    return redirectPreservingCookies(request, supabaseResponse, "/dashboard");
  }

  return supabaseResponse;
}

/**
 * Build a redirect that carries over any refreshed auth cookies, so a
 * just-refreshed session is never dropped on redirect.
 */
function redirectPreservingCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  const response = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}
