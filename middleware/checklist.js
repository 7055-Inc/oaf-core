import { NextResponse } from 'next/server';

export async function checklist(req) {
  const path = req.nextUrl.pathname;
  
  // Allow static files, login, and artist storefront pages
  if (path.startsWith('/_next') || 
      path.startsWith('/static') || 
      path === '/' ||
      (path.startsWith('/products/') && !path.includes('/new') && !path.includes('/edit') && !path.includes('/delete')) ||
      path.startsWith('/category/') ||
      path.startsWith('/search') ||
      path.startsWith('/events') ||
      path.startsWith('/articles') ||
      path.startsWith('/topics') ||
      path.startsWith('/artist-storefront') ||
      path === '/login' || 
      path === '/signup' || 
      path === '/terms-acceptance' ||
      path === '/profile-completion' ||
      path === '/profile/edit' ||
      path === '/user-type-selection' ||
      path === '/announcement-acknowledgment' ||
      path === '/favicon.ico') {
      return NextResponse.next();
    }

    const token = req.cookies.get('token')?.value;
    if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Call API service to verify token
    const response = await fetch('https://api2.onlineartfestival.com/auth/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        provider: 'validate',
        token: token
      })
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { roles, permissions } = await response.json();
    if (!roles || !roles.length) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user is Draft and needs to select user type
    if (roles.includes('Draft')) {
      const userTypeSelectionUrl = new URL('/user-type-selection', req.url);
      return NextResponse.redirect(userTypeSelectionUrl);
    }

    // Check if user has accepted current terms
    try {
    const termsResponse = await fetch('https://api2.onlineartfestival.com/api/terms/check-acceptance', {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
    });

    if (termsResponse.ok) {
        // Validate content type
        const contentType = termsResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // On error, allow access but silently handle the issue
          return NextResponse.next();
        }

      const termsData = await termsResponse.json();
      
        // Validate response structure
        if (typeof termsData.requiresAcceptance === 'boolean' && termsData.requiresAcceptance) {
        const termsUrl = new URL('/terms-acceptance', req.url);
        termsUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(termsUrl);
      }
      } else {
        // Handle non-200 responses
        // If it's a client error (4xx), redirect to login
        if (termsResponse.status >= 400 && termsResponse.status < 500) {
          return NextResponse.redirect(new URL('/login', req.url));
        }
        
        // For server errors (5xx), allow access silently
        // This prevents blocking users due to temporary API issues
      }
    } catch (error) {
      // On any error, allow access to prevent blocking legitimate users
      // The terms check will be retried on next request
      // This ensures availability over strict enforcement
    }

    // Skip profile completion check for cart and checkout pages
    if (!path.startsWith('/cart') && !path.startsWith('/checkout')) {
          // Check if user has completed required profile fields
    const profileResponse = await fetch('https://api2.onlineartfestival.com/users/profile-completion-status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        
        if (profileData.requiresCompletion) {
          const profileUrl = new URL('/profile-completion', req.url);
          profileUrl.searchParams.set('redirect', path);
          return NextResponse.redirect(profileUrl);
        }
      }
    }

    // Skip announcement acknowledgment check for cart and checkout pages
    if (!path.startsWith('/cart') && !path.startsWith('/checkout')) {
      // Check if user has pending announcements to acknowledge with proper error handling
      try {
      const announcementsResponse = await fetch('https://api2.onlineartfestival.com/api/announcements/check-pending', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
      });

      if (announcementsResponse.ok) {
          // Validate content type
          const contentType = announcementsResponse.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            // On error, allow access but silently handle the issue
            return NextResponse.next();
          }

        const announcementsData = await announcementsResponse.json();
        
          // Validate response structure
          if (typeof announcementsData.requiresAcknowledgment === 'boolean' && announcementsData.requiresAcknowledgment) {
          const acknowledgmentUrl = new URL('/announcement-acknowledgment', req.url);
          acknowledgmentUrl.searchParams.set('redirect', path);
          return NextResponse.redirect(acknowledgmentUrl);
        }
        } else {
          // Handle non-200 responses
          // If it's a client error (4xx), redirect to login
          if (announcementsResponse.status >= 400 && announcementsResponse.status < 500) {
            return NextResponse.redirect(new URL('/login', req.url));
          }
          
          // For server errors (5xx), allow access silently
        }
      } catch (error) {
        // On any error, allow access to prevent blocking legitimate users
        // The announcements check will be retried on next request
      }
    }

    // Check vendor permission for vendor-specific routes
    const vendorRoutes = [
      '/dashboard/products',
      '/products/new',
      '/products/edit'
    ];
    
    const requiresVendorPermission = vendorRoutes.some(route => path.startsWith(route));
    
    if (requiresVendorPermission) {
      if (!permissions || !permissions.includes('vendor')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export default checklist;