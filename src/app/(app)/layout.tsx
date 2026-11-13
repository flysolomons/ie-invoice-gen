import { AppNav } from "@/components/app/app-nav";
import { requireUser } from "@/lib/session";

// Reads the session cookie on every request (Neon Auth).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNav user={user} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
