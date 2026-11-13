import type { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

const METRICS = ["Outstanding", "Overdue", "Paid this month", "Expenses this month"];

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-sm text-muted-foreground">Metrics arrive in milestone 7.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((label) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">—</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
