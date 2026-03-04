import type { Context, Next } from "hono";

import { auth } from "../lib/auth";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
type AuthUser = NonNullable<AuthSession>["user"];
type AuthSessionData = NonNullable<AuthSession>["session"];

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    session: AuthSessionData;
  }
}

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Authentication required", code: "UNAUTHENTICATED" }, 401);
  }

  c.set("user", session.user as AuthUser);
  c.set("session", session.session as AuthSessionData);
  await next();
}
