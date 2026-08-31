// Server-side session helpers for the admin area.
//
// Kept separate from lib/auth/admin-session.ts because these import
// `next/headers` and `next/navigation`, which are unavailable in Edge
// middleware. The signing/verification logic itself is shared.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifySessionToken, type AdminSession } from './admin-session';

/** The current admin session, or null when signed out. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Require a signed-in admin. Redirects to the login page when absent.
 * Every admin page and every estimating server action calls this first.
 */
export async function requireAdmin(returnTo?: string): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    const target = returnTo ? `/admin/login?next=${encodeURIComponent(returnTo)}` : '/admin/login';
    redirect(target);
  }
  return session;
}

/**
 * Require a signed-in admin inside a server action, where redirecting mid
 * mutation is the wrong behavior. Returns null instead so the action can
 * respond with a clean error the form will display.
 */
export async function requireAdminForAction(): Promise<AdminSession | null> {
  return getAdminSession();
}
