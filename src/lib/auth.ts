import { timingSafeEqual } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const INVITE_CODE_HEADER = "x-invite-code";

function isValidInviteCode(code: string | null | undefined): boolean {
  const expected = process.env.INVITE_CODE;
  if (!expected || !code) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // Role surfaced on the session for cheap admin gating in the UI.
      // Authoritative admin checks still re-read from the DB server-side.
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // users cannot set their own role at signup
      },
    },
  },
  hooks: {
    // Registration is invite-only: enforce the code server-side so a direct
    // POST to the sign-up endpoint can't skip it.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      if (!isValidInviteCode(ctx.headers?.get(INVITE_CODE_HEADER))) {
        throw new APIError("FORBIDDEN", {
          message: "Nieprawidłowy kod zaproszenia",
        });
      }
    }),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export type Session = typeof auth.$Infer.Session;
