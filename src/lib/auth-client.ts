"use client";

import { createAuthClient } from "@neon/auth/next";

/** Browser-side Neon Auth client (talks to our /api/auth proxy). */
export const authClient = createAuthClient();
