'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      // Fetch userId from /users/me
      fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user profile');
          }
          return res.json();
        })
        .then(data => {
          setUserId(data.id);
          localStorage.setItem('userId', data.id); // Store userId for future use
          // Fetch cart count
          fetchCartCount(token);
        })
        .catch(err => {
          console.error('Error fetching user ID:', err.message);
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
        });
    } else {
      setIsLoggedIn(false);
      setUserId(null);
      setCartItemCount(0);
    }
  }, []);

  const fetchCartCount = async (token) => {
    try {
      // Get active cart
      const cartRes = await fetch('https://api2.onlineartfestival.com/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (cartRes.ok) {
        const carts = await cartRes.json();
        const activeCart = carts.find(cart => cart.status === 'draft');
        
        if (activeCart) {
          // Get cart items
          const itemsRes = await fetch(`https://api2.onlineartfestival.com/cart/${activeCart.id}/items`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (itemsRes.ok) {
            const items = await itemsRes.json();
            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            setCartItemCount(totalCount);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching cart count:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setUserId(null);
    setCartItemCount(0);
    window.location.href = '/';
  };

  return (
    <header style={{
      backgroundColor: '#FFFFFF',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src="/static_media/logo.png"
          alt="Online Art Festival Logo"
          style={{ width: '120px', height: 'auto' }}
        />
      </div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/" style={{ color: '#055474', textDecoration: 'none' }}>
          Home
        </Link>
        {isLoggedIn && (
          <Link 
            href="/cart" 
            style={{ 
              color: '#055474', 
              textDecoration: 'none',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            🛒
            {cartItemCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                position: 'absolute',
                top: '-8px',
                right: '-8px'
              }}>
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </Link>
        )}
        {isLoggedIn && userId ? (
          <>
            <Link href="/profile/[id]" as={`/profile/${userId}`} style={{ color: '#055474', textDecoration: 'none' }}>
              Profile
            </Link>
            <button onClick={handleLogout} style={{ color: '#055474', background: 'none', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </>
        ) : (
          <Link href="#" onClick={() => document.getElementById('loginModal').style.display = 'block'} style={{ color: '#055474', textDecoration: 'none' }}>
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}