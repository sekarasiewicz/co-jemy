import { unstable_rethrow } from "next/navigation";

/**
 * Next.js replaces the message of an error thrown from a server action with a
 * generic one in production. Actions whose failures the user should read
 * return this shape instead of throwing.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** An error whose message is meant for the user (Polish, no internals). */
export class UserError extends Error {
  override name = "UserError";
}

const FALLBACK_MESSAGE = "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";

/** Server: run an action body, turning failures into a readable result. */
export async function toActionResult<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // Let redirect()/notFound() and other framework control flow through.
    unstable_rethrow(error);
    if (error instanceof UserError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: FALLBACK_MESSAGE };
  }
}

/** Client: the action's data, or throws an Error carrying its message. */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
