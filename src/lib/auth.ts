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

const PRODUCTION_URL = "https://co-jemy.karasiewicz.dev";

// Origin used for auth redirects and CSRF origin checks. Preview deploys get
// their own URL so sign-in works there too.
function resolveBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

const baseURL = resolveBaseURL();

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [...new Set([baseURL, PRODUCTION_URL])],
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
    // Validate the session from a signed cookie for up to 5 minutes instead
    // of a DB lookup on every request. Revoked sessions expire within that.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
