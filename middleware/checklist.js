import { NextResponse } from 'next/server';

export async function checklist(req) {
    const path = req.nextUrl.pathname;
  console.log('All cookies:', req.cookies);
  console.log('Token cookie:', req.cookies.get('token'));
  
  // Allow static files and login
  if (path.startsWith('/_next') || 
      path.startsWith('/static') || 
      path === '/' ||
      (path.startsWith('/products/') && !path.includes('/new') && !path.includes('/edit') && !path.includes('/delete')) ||
      path.startsWith('/category/') ||
      path.startsWith('/search') ||
      path.startsWith('/cart') ||
      path === '/login' || 
      path === '/signup' || 
      path === '/favicon.ico') {
    console.log('Allowing public path:', path);
      return NextResponse.next();
    }

    const token = req.cookies.get('token')?.value;
  console.log('Token exists?', !!token);
    if (!token) {
    console.log('No token, redirecting to login');
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
      console.log('Token verification failed, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { roles } = await response.json();
    console.log('User roles:', roles);
    if (!roles || !roles.length) {
      console.log('No roles found, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    console.log('All checks passed, allowing access');
    return NextResponse.next();
  } catch (error) {
    console.error('Error in checklist:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export default checklist;