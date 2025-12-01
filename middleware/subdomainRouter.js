import { NextResponse } from 'next/server';

export async function subdomainRouter(req) {
  const hostname = req.headers.get('host') || '';
  let subdomain = hostname.split('.')[0];
  let isCustomDomain = false;
  
  // Skip if this is the main domain
  if (hostname === 'brakebee.com' || hostname === 'www.brakebee.com') {
    return NextResponse.next();
  }
  
  // Handle custom domains - check if this is a verified custom domain
  if (!hostname.includes('.brakebee.com')) {
    isCustomDomain = true;
    try {
      // Check if this is a verified custom domain
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/sites/resolve-custom-domain/${hostname}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const siteData = await response.json();
        subdomain = siteData.subdomain; // Use the mapped subdomain
      } else {
        // Not a verified custom domain, let it pass through normally
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Error resolving custom domain:', error);
      return NextResponse.next();
    }
  }
  
  // Skip if this is not a subdomain pattern and not a custom domain
  if (!isCustomDomain && (!hostname.includes('.brakebee.com') || subdomain === 'www' || subdomain === 'api')) {
    return NextResponse.next();
  }
  
  try {
    // Handle custom subdomains with special routing
    // Add more custom subdomains here as needed
    if (subdomain === 'signup') {
      // Route signup subdomain to custom redirect page, preserving all query parameters
      const rewriteUrl = new URL('/custom-sites/signup', req.url);
      rewriteUrl.searchParams.set('subdomain', subdomain);
      return NextResponse.rewrite(rewriteUrl);
    }
    
    if (subdomain === 'crafts') {
      // Route crafts subdomain to crafts marketplace
      return NextResponse.rewrite(new URL(`/crafts${req.nextUrl.pathname}${req.nextUrl.search}`, req.url));
    }
    
    // Example: Add more custom subdomains like this:
    // if (subdomain === 'promo') {
    //   return NextResponse.rewrite(new URL(`/custom-sites/promo?subdomain=${subdomain}`, req.url));
    // }
    
    // Check if this subdomain corresponds to an active artist site
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/sites/resolve/${subdomain}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Route to custom 404 page for non-existent subdomains
      return NextResponse.rewrite(new URL(`/custom-sites/subdomain-not-found?subdomain=${subdomain}`, req.url));
    }
    
    const siteData = await response.json();
    
    // Check if site is available (active status)
    if (!siteData.available) {
      // Route to site unavailable page with status information
      const unavailableUrl = new URL('/custom-sites/site-unavailable', req.url);
      unavailableUrl.searchParams.set('subdomain', subdomain);
      unavailableUrl.searchParams.set('status', siteData.status);
      unavailableUrl.searchParams.set('siteName', siteData.site_name || 'Artist Site');
      unavailableUrl.searchParams.set('reason', siteData.statusMessage || 'This site is currently unavailable.');
      return NextResponse.rewrite(unavailableUrl);
    }
    
    // Route to appropriate artist storefront page
    const path = req.nextUrl.pathname;
    
    if (path === '/') {
      // Homepage
      const rewriteUrl = new URL('/artist-storefront', req.url);
      rewriteUrl.searchParams.set('subdomain', subdomain);
      rewriteUrl.searchParams.set('userId', siteData.user_id);
      rewriteUrl.searchParams.set('siteName', siteData.site_name);
      rewriteUrl.searchParams.set('themeName', siteData.theme_name);
      return NextResponse.rewrite(rewriteUrl);
    } else if (path === '/about') {
      // About page
      const rewriteUrl = new URL('/artist-storefront/about', req.url);
      rewriteUrl.searchParams.set('subdomain', subdomain);
      rewriteUrl.searchParams.set('userId', siteData.user_id);
      rewriteUrl.searchParams.set('siteName', siteData.site_name);
      return NextResponse.rewrite(rewriteUrl);
    } else if (path === '/products' || path === '/gallery') {
      // Products/Gallery page
      const rewriteUrl = new URL('/artist-storefront/products', req.url);
      rewriteUrl.searchParams.set('subdomain', subdomain);
      rewriteUrl.searchParams.set('userId', siteData.user_id);
      rewriteUrl.searchParams.set('siteName', siteData.site_name);
      return NextResponse.rewrite(rewriteUrl);
    } else if (path.startsWith('/product/')) {
      // Individual product page (if we have one)
      const productId = path.split('/product/')[1];
      const rewriteUrl = new URL('/artist-storefront/product', req.url);
      rewriteUrl.searchParams.set('subdomain', subdomain);
      rewriteUrl.searchParams.set('productId', productId);
      rewriteUrl.searchParams.set('userId', siteData.user_id);
      return NextResponse.rewrite(rewriteUrl);
    } else if (path.startsWith('/api/')) {
      // API calls should pass through
      return NextResponse.next();
    } else {
      // Route to custom 404 page for unknown paths
      const rewriteUrl = new URL('/custom-sites/subdomain-404', req.url);
      rewriteUrl.searchParams.set('subdomain', subdomain);
      rewriteUrl.searchParams.set('hostname', hostname);
      rewriteUrl.searchParams.set('isCustomDomain', isCustomDomain.toString());
      return NextResponse.rewrite(rewriteUrl);
    }
    
  } catch (error) {
    // Route to custom error page on error
    return NextResponse.rewrite(new URL(`/custom-sites/subdomain-error?subdomain=${subdomain}&error=${encodeURIComponent(error.message)}`, req.url));
  }
}

export default subdomainRouter; 