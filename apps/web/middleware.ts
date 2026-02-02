import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Deixar todas as rotas da API passarem sem interferência
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
