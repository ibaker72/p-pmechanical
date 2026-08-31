// Edge guard for the authenticated admin area.
//
// This is defense in depth, not the only check: every admin page calls
// requireAdmin() and every mutation calls requireAdminForAction(). The
// middleware exists so an unauthenticated request never reaches page rendering
// or a database client in the first place.

import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, verifySessionToken } from '@/lib/auth/admin-session';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The login page must stay reachable while signed out.
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl);
  // Clear a stale or tampered cookie so the browser stops resending it.
  if (token) response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
