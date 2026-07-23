import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Force HTTPS in production (or when FORCE_HTTPS=true).
 * Relies on the platform / reverse proxy setting X-Forwarded-Proto.
 */
export function middleware(request: NextRequest) {
  const forceHttps =
    process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production';

  if (!forceHttps) {
    return NextResponse.next();
  }

  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host') || '';

  // Skip local / preview hosts without TLS termination
  if (
    !proto ||
    proto === 'https' ||
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1')
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
