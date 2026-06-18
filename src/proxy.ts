import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16 Proxy (formerly Middleware). Runs on every matched request to
 * refresh the Supabase session cookie and apply optimistic auth redirects.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static, _next/image
     * - favicon.ico and common image files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
