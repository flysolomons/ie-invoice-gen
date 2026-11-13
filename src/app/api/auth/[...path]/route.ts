import { auth } from "@/lib/auth";

const handlers = auth.handler();

// Public sign-up is disabled: accounts are created only by accepting an invite
// (server-side) or by the seed script.
const blocked = (request: Request) =>
  new URL(request.url).pathname.endsWith("/sign-up/email")
    ? Response.json({ message: "Sign-up is by invitation only." }, { status: 403 })
    : null;

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
export const POST: typeof handlers.POST = async (request, ctx) =>
  blocked(request) ?? handlers.POST(request, ctx);
