import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">Owner access required</h1>
      <p className="text-sm text-muted-foreground">Ask the account owner to make this change.</p>
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        Back to dashboard
      </Link>
    </main>
  );
}
