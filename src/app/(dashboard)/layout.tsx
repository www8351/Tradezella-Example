import { requireUser } from "@/lib/auth";
import { getActiveAccount } from "@/lib/data/trades";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

/**
 * Protected dashboard shell. `requireUser()` is the secure auth gate; the Proxy
 * provides only an optimistic pre-check.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const { accounts, active } = await getActiveAccount();

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          accounts={accounts}
          activeId={active?.id ?? null}
          userEmail={user.email ?? ""}
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
