import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app/app-sidebar";
import { TopBar } from "@/components/app/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/server/settings";

// Reads the session cookie on every request (Neon Auth).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [settings, cookieStore] = await Promise.all([getSettings(), cookies()]);
  // Remember collapsed/expanded across reloads without a flash.
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <AppSidebar user={user} businessName={settings.name} logoVersion={settings.logoKey} />
      <SidebarInset className="bg-transparent">
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-10 md:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
