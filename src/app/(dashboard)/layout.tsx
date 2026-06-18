import { requireUser } from "@/lib/auth";

/**
 * Protected layout for the dashboard route group. `requireUser()` is the
 * secure server-side auth gate (validates the session against Supabase Auth
 * and redirects to /login when unauthenticated). The Proxy provides only an
 * optimistic, cookie-level pre-check.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <div className="min-h-svh">{children}</div>;
}
