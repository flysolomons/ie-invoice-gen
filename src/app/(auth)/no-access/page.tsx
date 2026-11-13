import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { signOut } from "../actions";

// Reads the session cookie on every request (Neon Auth).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold">You&rsquo;re not on this team yet</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your account exists, but it hasn&rsquo;t been added to this business. Ask the owner to send you
        an invite.
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
