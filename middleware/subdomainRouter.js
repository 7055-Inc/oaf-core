import { NextResponse } from 'next/server';

export async function subdomainRouter(req) {
  const hostname = req.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Skip if this is the main domain
  if (hostname === 'main.onlineartfestival.com' || hostname === 'onlineartfestival.com') {
    return NextResponse.next();
  }
  
  // Skip if this is not a subdomain pattern
  if (!hostname.includes('.onlineartfestival.com') || subdomain === 'www' || subdomain === 'api' || subdomain === 'api2') {
    return NextResponse.next();
  }
  
  try {
    // Check if this subdomain corresponds to an active artist site
    const response = await fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Redirect to main site if subdomain doesn't exist
      return NextResponse.redirect(new URL('https://main.onlineartfestival.com'));
    }
    
    const siteData = await response.json();
    
    // Route to appropriate artist storefront page
    const path = req.nextUrl.pathname;
    
    if (path === '/') {
      // Homepage
      return NextResponse.rewrite(new URL(`/artist-storefront?subdomain=${subdomain}&userId=${siteData.user_id}&siteName=${encodeURIComponent(siteData.site_name)}&themeName=${siteData.theme_name}`, req.url));
    } else if (path === '/about') {
      // About page
      return NextResponse.rewrite(new URL(`/artist-storefront/about?subdomain=${subdomain}&userId=${siteData.user_id}&siteName=${encodeURIComponent(siteData.site_name)}`, req.url));
    } else if (path === '/products' || path === '/gallery') {
      // Products/Gallery page
      return NextResponse.rewrite(new URL(`/artist-storefront/products?subdomain=${subdomain}&userId=${siteData.user_id}&siteName=${encodeURIComponent(siteData.site_name)}`, req.url));
    } else if (path.startsWith('/product/')) {
      // Individual product page (if we have one)
      const productId = path.split('/product/')[1];
      return NextResponse.rewrite(new URL(`/artist-storefront/product?subdomain=${subdomain}&productId=${productId}&userId=${siteData.user_id}`, req.url));
    } else if (path.startsWith('/api/')) {
      // API calls should pass through
      return NextResponse.next();
    } else {
      // Default to homepage for unknown paths
      return NextResponse.rewrite(new URL(`/artist-storefront?subdomain=${subdomain}&userId=${siteData.user_id}&siteName=${encodeURIComponent(siteData.site_name)}&themeName=${siteData.theme_name}`, req.url));
    }
    
  } catch (error) {
    // Redirect to main site on error
    return NextResponse.redirect(new URL('https://main.onlineartfestival.com'));
  }
}

export default subdomainRouter; 