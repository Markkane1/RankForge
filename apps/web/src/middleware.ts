import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse, type NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PREFIXES = ['/api/webhooks/', '/api/events/conversion'];

function isSameOrigin(request: NextRequest) {
  const source = request.headers.get('origin') ?? request.headers.get('referer');
  if (!source) return false;

  try {
    return new URL(source).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export default function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    MUTATING_METHODS.has(request.method) &&
    !CSRF_EXEMPT_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix)) &&
    !isSameOrigin(request)
  ) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  return auth(request as any);
}

export const config = {
  matcher: ['/', '/api/:path*', '/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
