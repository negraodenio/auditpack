import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Public routes
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/reset-password'];
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  // API routes that don't require auth (auth endpoints and webhooks)
  const isPublicApi = req.nextUrl.pathname.startsWith('/api/auth') || 
                      req.nextUrl.pathname.startsWith('/api/webhooks');

  if (isPublicApi) {
    return res;
  }

  // Redirect to login if not authenticated
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if already authenticated
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
