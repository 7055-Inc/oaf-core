import { subdomainRouter } from './middleware/subdomainRouter';

export default async function middleware(req) {
  const path = req.nextUrl.pathname;
  if (path.startsWith('/_next/static') || 
      path.startsWith('/_next/image') || 
      path.startsWith('/templates/') ||
      path === '/favicon.ico') {
    return;
  }

  return subdomainRouter(req);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
