'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';
import CategoryMenu from './CategoryMenu';
import styles from './Header.module.css';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const dropdownTimeoutRef = useRef(null);

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
            if (res.status === 401) {
              // Token is invalid or expired
              console.log('Token expired or invalid, clearing authentication');
              throw new Error('Token expired');
            }
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
          console.log('Authentication error:', err.message);
          // Don't log this as an error since it's expected for non-authenticated users
          setIsLoggedIn(false);
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoggedIn(false);
      setUserId(null);
      setCartItemCount(0);
      setIsLoading(false);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
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
      console.log('Error fetching cart count:', err.message);
      // Don't log as error since this is expected for non-authenticated users
    }
  };

  const handleDropdownEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setShowAccountDropdown(true);
  };

  const handleDropdownLeave = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowAccountDropdown(false);
    }, 300);
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
    <>
      <header className={styles.header}>
        {/* Main header row */}
        <div className={styles.headerRow}>
          {/* Logo */}
          <div>
            <Link href="/">
              <img
                src="/static_media/logo.png"
                alt="Online Art Festival Logo"
                className={styles.logo}
              />
            </Link>
          </div>
          
          {/* Right side icons */}
          <div className={styles.iconsContainer}>
            {/* Search Icon */}
            <button
              onClick={() => setShowSearchModal(true)}
              className={styles.iconButton}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>

            {/* Cart Icon */}
            {isLoggedIn && !isLoading && (
              <div className={styles.cartContainer}>
                <Link href="/cart" className={styles.iconLink}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                </Link>
                {cartItemCount > 0 && (
                  <span className={styles.cartBadge}>
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </div>
            )}

            {/* User Icon */}
            {isLoggedIn && userId && !isLoading ? (
              <div 
                style={{ position: 'relative' }}
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                <button className={styles.iconButton}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>
                {showAccountDropdown && (
                  <div 
                    className={styles.userDropdown}
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <Link href="/dashboard" className={styles.dropdownLink}>
                      Dashboard
                    </Link>
                    <Link href={`/profile/${userId}`} className={styles.dropdownLink}>
                      My Profile
                    </Link>
                    <button onClick={handleLogout} className={styles.dropdownButton}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : !isLoading ? (
              <Link href="/login" className={styles.iconLink}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </Link>
            ) : (
              <div className={styles.loadingText}>Loading...</div>
            )}
          </div>
        </div>

        {/* Category Menu - positioned above the border */}
        <CategoryMenu />
      </header>

      {/* Search Modal */}
      {showSearchModal && (
        <SearchBar 
          placeholder="Search products, artists, promoters..." 
          autoFocus={true}
          showModal={true}
          onClose={() => setShowSearchModal(false)}
        />
      )}
    </>
  );
}