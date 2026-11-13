import { Clock, Info } from "lucide-react";
import type { Metadata } from "next";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { env } from "@/env";
import { initials } from "@/lib/initials";
import { requireOwner } from "@/lib/session";
import { isAllowedDomain } from "@/lib/email-domain";
import { listMembers, listPendingSignIns } from "@/server/members";
import { addPendingMember, setMemberDisabled, setMemberRole } from "./actions";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireOwner();
  const [team, pending] = await Promise.all([listMembers(), listPendingSignIns()]);
  const domains = env.ALLOWED_EMAIL_DOMAINS;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Team"
        description="Who can use the app, and what they can do."
      />

      <div className="flex gap-3 rounded-xl border bg-card p-4 text-sm shadow-float">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="grid gap-1">
          <p className="font-medium">How people join</p>
          {env.AUTH_MICROSOFT_ENABLED && domains.length > 0 ? (
            <p className="text-muted-foreground">
              Staff sign in with their work Microsoft account. Anyone with a verified{" "}
              {domains.map((d, i) => (
                <span key={d}>
                  {i > 0 && (i === domains.length - 1 ? " or " : ", ")}
                  <span className="font-medium text-foreground">@{d}</span>
                </span>
              ))}{" "}
              email joins automatically as a <span className="font-medium text-foreground">member</span>.
              Make finance leads <span className="font-medium text-foreground">owners</span> here.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Microsoft sign-in isn&rsquo;t switched on yet, so nobody joins automatically. See
              the README for the setup steps.
            </p>
          )}
          <p className="text-muted-foreground">
            Owners can also void invoices, reverse payments, change settings and manage the team.
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="grid gap-3">
          <div>
            <h2 id="pending-heading" className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-4 text-warning-foreground dark:text-warning" aria-hidden />
              Waiting for access ({pending.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Signed in with Microsoft but not let in automatically. Add the people you recognise.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-float">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Why they&rsquo;re waiting</TableHead>
                  <TableHead className="hidden sm:table-cell">First sign-in</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.authUserId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 rounded-lg">
                          <AvatarFallback className="rounded-lg bg-warning/25 text-xs font-semibold text-warning-foreground">
                            {initials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid min-w-0">
                          <span className="truncate font-medium">{p.name}</span>
                          <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {!isAllowedDomain(p.email, domains)
                        ? "Email isn’t on an allowed domain"
                        : !p.emailVerified
                          ? "Microsoft didn’t confirm the email"
                          : "Not added yet"}
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {p.firstSignedInAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ConfirmActionButton
                          variant="outline"
                          label="Add as member"
                          confirmLabel="Confirm add"
                          action={addPendingMember.bind(null, p.authUserId)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-float">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((m) => {
              const isMe = m.authUserId === me.id;
              const removed = !!m.disabledAt;
              return (
                <TableRow key={m.id} className={removed ? "text-muted-foreground" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {initials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid min-w-0">
                        <span className="truncate font-medium">
                          {m.name}
                          {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {removed ? (
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border ring-inset">
                        Removed
                      </span>
                    ) : (
                      <span
                        className={
                          m.role === "owner"
                            ? "inline-flex rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
                            : "inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20 ring-inset"
                        }
                      >
                        {m.role === "owner" ? "Owner" : "Member"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">
                    {m.createdAt.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell>
                    {!isMe && (
                      <div className="flex justify-end gap-1">
                        {!removed && (
                          <ConfirmActionButton
                            variant="ghost"
                            label={m.role === "owner" ? "Make member" : "Make owner"}
                            confirmLabel="Confirm"
                            action={setMemberRole.bind(null, m.id, m.role === "owner" ? "member" : "owner")}
                          />
                        )}
                        <ConfirmActionButton
                          variant="ghost"
                          label={removed ? "Restore" : "Remove"}
                          confirmLabel={removed ? "Confirm restore" : "Confirm remove"}
                          action={setMemberDisabled.bind(null, m.id, !removed)}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
