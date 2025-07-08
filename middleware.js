import { checklist } from './middleware/checklist';
import { subdomainRouter } from './middleware/subdomainRouter';

export default async function middleware(req) {
  const hostname = req.headers.get('host') || '';
  
  // Allow static files to pass through immediately
  const path = req.nextUrl.pathname;
  if (path.startsWith('/_next/static') || 
      path.startsWith('/_next/image') || 
      path === '/favicon.ico') {
    return;
  }
  
  // Route to subdomain handler for artist sites
  if (hostname.includes('.onlineartfestival.com') && 
      hostname !== 'main.onlineartfestival.com' && 
      hostname !== 'onlineartfestival.com' &&
      !hostname.startsWith('api') &&
      !hostname.startsWith('www')) {
    return subdomainRouter(req);
  }
  
  // Route to checklist for main domain
  return checklist(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 