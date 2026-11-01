import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Optimistic gate: no session cookie → /login. The API still validates the session on every
 * call; this only avoids rendering protected pages for signed-out users.
 */
export function proxy(request: NextRequest) {
  const isRedeemRoute = /^\/orgs\/[^/]+\/redeem(\/|$)/.test(request.nextUrl.pathname);
  const hasCounterDeviceAccess =
    isRedeemRoute &&
    (request.nextUrl.searchParams.has('pair') ||
      Boolean(request.cookies.get('playora_counter_device')?.value));

  if (!getSessionCookie(request) && !hasCounterDeviceAccess) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (hasCounterDeviceAccess) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-counter-device-access', '1');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|manifest\\.webmanifest|_next/|favicon.ico|.*\\..*).*)'],
};
