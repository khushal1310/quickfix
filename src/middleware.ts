import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'default-jwt-secret-key-change-in-production';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect internal dashboards
  const isProtectedPath = 
    pathname.startsWith('/customer') || 
    pathname.startsWith('/provider') || 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/account');

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = req.cookies.get('qf_token')?.value;

  if (!token) {
    // Redirect to login if token is missing
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify JWT
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    const userRole = payload.user_metadata?.role;

    // Check specific role path matches
    if (pathname.startsWith('/customer') && userRole !== 'customer') {
      return NextResponse.redirect(new URL(`/${userRole || 'login'}`, req.url));
    }
    if (pathname.startsWith('/provider') && userRole !== 'provider') {
      return NextResponse.redirect(new URL(`/${userRole || 'login'}`, req.url));
    }
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL(`/${userRole || 'login'}`, req.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error('Middleware JWT Verification failed:', err);
    // Clear cookie and redirect
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('qf_token');
    return response;
  }
}

export const config = {
  matcher: [
    '/customer/:path*',
    '/provider/:path*',
    '/admin/:path*',
    '/chat/:path*',
    '/account/:path*',
  ],
};
