import type { Metadata } from "next";
import { Panel } from "@/components/app/blocks";
import { PageHeader } from "@/components/app/page-header";
import { requireUser } from "@/lib/session";
import { ClientForm, EMPTY_CLIENT } from "../client-form";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireUser();
  return (
    <div className="grid gap-6">
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        title="New client"
        description="Add a company or person you invoice."
      />
      <Panel title="Client details" className="max-w-3xl">
        <ClientForm id={null} defaults={EMPTY_CLIENT} />
      </Panel>
    </div>
  );
}
