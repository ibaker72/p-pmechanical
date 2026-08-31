'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE_NAME,
  adminIdentity,
  createSessionToken,
  isAdminAuthConfigured,
  sessionCookieOptions,
  verifyAdminPassword,
} from '@/lib/auth/admin-session';
import { limitForm } from '@/lib/ratelimit';
import { loginSchema } from '@/lib/estimating/validation';
import { actionError, type ActionResult } from '@/lib/estimating/types';

/** Same precedence lib/ratelimit.ts uses, read from the server-action headers. */
function requestIp(): string {
  const incoming = headers();
  return (
    incoming.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    incoming.get('x-real-ip') ||
    incoming.get('cf-connecting-ip') ||
    'anonymous'
  );
}

/**
 * Sign in to the admin.
 *
 * Reuses the app's existing Upstash rate limiter so repeated password guesses
 * are throttled the same way the public lead forms are. When Upstash is not
 * configured the limiter is a documented no-op (see lib/ratelimit.ts).
 */
export async function loginAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  if (!isAdminAuthConfigured()) {
    return actionError(
      'Admin sign-in is not configured on this server. Set ADMIN_SECRET to a value of at least 16 characters.',
    );
  }

  const parsed = loginSchema.safeParse({
    password: formData.get('password') ?? '',
    next: formData.get('next') ?? '',
  });
  if (!parsed.success) {
    return actionError('Enter the admin password.');
  }

  const limit = await limitForm(`admin-login:${requestIp()}`);
  if (!limit.success) {
    return actionError('Too many sign-in attempts. Wait a minute and try again.');
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    // Deliberately generic: never reveal whether a secret is configured or how
    // close a guess was.
    return actionError('That password is not correct.');
  }

  const token = await createSessionToken(adminIdentity());
  cookies().set(ADMIN_COOKIE_NAME, token, sessionCookieOptions());

  // Only ever redirect to a path inside this app.
  const requested = parsed.data.next ?? '';
  const safeNext =
    requested.startsWith('/admin') && !requested.startsWith('//') ? requested : '/admin';
  redirect(safeNext);
}

export async function logoutAction(): Promise<void> {
  cookies().set(ADMIN_COOKIE_NAME, '', sessionCookieOptions(0));
  redirect('/admin/login');
}
