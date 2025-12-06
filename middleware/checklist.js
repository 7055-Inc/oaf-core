import { NextResponse } from 'next/server';

export async function checklist(req) {
  const path = req.nextUrl.pathname;
  
  // ===========================================
  // DENYLIST APPROACH: Everything is PUBLIC except these protected paths
  // This ensures new pages are SEO-friendly by default
  // ===========================================
  
  // Always allow static assets (no auth needed)
  if (path.startsWith('/_next') || 
      path.startsWith('/static') || 
      path.startsWith('/static_media') ||
      path.startsWith('/api/') ||  // API routes handle their own auth
      path === '/favicon.ico') {
      return NextResponse.next();
    }

  // PROTECTED PATHS - these require authentication
  const protectedPaths = [
    '/dashboard',           // User dashboard (all subpaths)
    '/checkout',            // Checkout flow
    '/cart',                // Shopping cart
    '/profile/edit',        // Editing your own profile
    '/products/new',        // Creating products
    '/products/edit',       // Editing products
    '/products/delete',     // Deleting products
    '/vendor',              // Vendor-specific pages
    '/profile-completion',  // Onboarding: complete profile
    '/terms-acceptance',    // Onboarding: accept terms
    '/user-type-selection', // Onboarding: select user type
    '/announcement-acknowledgment', // Onboarding: acknowledge announcements
  ];
  
  // Check if current path requires authentication
  const requiresAuth = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(protectedPath + '/')
  );
  
  // If path doesn't require auth, allow through (PUBLIC)
  if (!requiresAuth) {
    return NextResponse.next();
  }
  
  // === PROTECTED PATH - Check authentication ===
    const token = req.cookies.get('token')?.value;
    if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Call API service to verify token
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/exchange`, {
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
    const termsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/terms/check-acceptance?t=${Date.now()}`, {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
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
    const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/profile-completion-status`, {
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
      const announcementsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/announcements/check-pending`, {
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

    // Check vendor permission for vendor-specific routes (admins have automatic access)
    const vendorRoutes = [
      '/dashboard/products',
      '/products/new',
      '/products/edit'
    ];
    
    const requiresVendorPermission = vendorRoutes.some(route => path.startsWith(route));
    const isAdmin = roles && roles.includes('admin');
    
    if (requiresVendorPermission) {
      if (!isAdmin && (!permissions || !permissions.includes('vendor'))) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export default checklist;