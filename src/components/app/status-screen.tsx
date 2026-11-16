import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Centred card for 403 / 404 style screens. */
export function StatusScreen({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[60svh] flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-card p-8 text-center shadow-float ring-1 ring-border">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">{children}</p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
