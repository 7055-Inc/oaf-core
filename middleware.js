import { checklist } from './middleware/checklist';
import { subdomainRouter } from './middleware/subdomainRouter';
import { maintenanceMode } from './middleware/maintenanceMode';

export default async function middleware(req) {
  const hostname = req.headers.get('host') || '';
  
  // Allow static files to pass through immediately
  const path = req.nextUrl.pathname;
  if (path.startsWith('/_next/static') || 
      path.startsWith('/_next/image') || 
      path === '/favicon.ico') {
    return;
  }

  // Check maintenance mode first (applies to all domains)
  const maintenanceResponse = await maintenanceMode(req);
  if (maintenanceResponse && maintenanceResponse.status === 307) {
    return maintenanceResponse;
  }
  
  // Route to subdomain handler for artist sites and custom domains
  // Exclude staging/mobile subdomains - they should use checklist like main domain
  if ((hostname.includes('.brakebee.com') && 
       hostname !== 'main.brakebee.com' && 
       hostname !== 'www.brakebee.com' &&
       hostname !== 'staging.brakebee.com' &&
       !hostname.startsWith('api') &&
       !hostname.startsWith('staging') &&
       !hostname.startsWith('mobile') &&
       !hostname.startsWith('www')) ||
      (!hostname.includes('.brakebee.com') && 
       hostname !== 'brakebee.com' &&
       hostname !== 'localhost' &&
       !hostname.startsWith('127.0.0.1'))) {
    return subdomainRouter(req);
  }
  
  // Route to checklist for main domain (brakebee.com, main.brakebee.com, www.brakebee.com, localhost)
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