import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { signOut } from "../actions";

// Reads the session cookie on every request (Neon Auth).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-card p-8 text-center shadow-float ring-1 ring-border">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-warning/20 text-warning-foreground dark:text-warning">
          <ShieldAlert className="size-6" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">You&rsquo;re not on this team yet</h1>
          <p className="text-muted-foreground">
            Your account exists, but it hasn&rsquo;t been added to this business. Ask the owner to
            send you an invite.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
