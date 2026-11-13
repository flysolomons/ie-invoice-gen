import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { requireUser } from "@/lib/session";
import { ClientForm, EMPTY_CLIENT } from "../client-form";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireUser();
  return (
    <div className="grid gap-6">
      <PageHeader title="New client" />
      <ClientForm id={null} defaults={EMPTY_CLIENT} />
    </div>
  );
}
