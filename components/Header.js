'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SearchBar, SearchModal } from './search';
import { usePageType } from '../hooks/usePageType';
import { getAuthToken, clearAuthTokens } from '../lib/csrf';
import { authApiRequest, apiGet, API_ENDPOINTS } from '../lib/apiUtils';
import ImpersonationExitButton from './ImpersonationExitButton';
import styles from './Header.module.css';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
  const [categories, setCategories] = useState([]);

  // Handle opening search modal with query
  const handleSearchModalOpen = (query = '') => {
    setSearchQuery(query);
    setShowSearchModal(true);
  };
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const collectionsTimeoutRef = useRef(null);
  const { shouldHideCategories, shouldShowHamburger, isDashboardPage } = usePageType();

  // Scroll behavior for header transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    
    // Prevent API calls on login/signup pages to avoid redirect loops
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthPage = currentPath === '/login' || currentPath === '/signup' || currentPath === '/logout';
    
    if (token && !isAuthPage) {
      setIsLoggedIn(true);
      // Fetch userId from /users/me
      authApiRequest(API_ENDPOINTS.USERS_ME, {
        method: 'GET',
        headers: {
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
          // Fetch cart count
          fetchCartCount();
        })
        .catch(err => {
          console.log('Authentication error:', err.message);
          // Clear authentication and redirect if needed - but only if not on auth pages
          if (!isAuthPage) {
            setIsLoggedIn(false);
            clearAuthTokens();
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Set basic state without API calls
      setIsLoggedIn(!!token && !isAuthPage);
      setUserId(null);
      setCartItemCount(0);
      setIsLoading(false);
    }
    
    // Listen for auth logout events
    const handleAuthLogout = () => {
      setIsLoggedIn(false);
      setUserId(null);
      setCartItemCount(0);
    };
    
    window.addEventListener('auth-logout', handleAuthLogout);
    
    return () => {
      window.removeEventListener('auth-logout', handleAuthLogout);
    };
  }, []);

  // Fetch categories for Collections dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/categories`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.log('Error fetching categories:', err.message);
      }
    };

    fetchCategories();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
      if (collectionsTimeoutRef.current) {
        clearTimeout(collectionsTimeoutRef.current);
      }
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileMenu && !event.target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMenu]);

  const fetchCartCount = async () => {
    try {
      // Get active cart
      const cartRes = await authApiRequest(API_ENDPOINTS.CART, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (cartRes.ok) {
        const carts = await cartRes.json();
        const activeCart = carts.find(cart => cart.status === 'draft');
        
        if (activeCart) {
          // Get cart items
          const itemsRes = await authApiRequest(`${API_ENDPOINTS.CART}/${activeCart.id}/items`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
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

  const handleCollectionsEnter = () => {
    if (collectionsTimeoutRef.current) {
      clearTimeout(collectionsTimeoutRef.current);
      collectionsTimeoutRef.current = null;
    }
    setShowCollectionsDropdown(true);
  };

  const handleCollectionsLeave = () => {
    if (collectionsTimeoutRef.current) {
      clearTimeout(collectionsTimeoutRef.current);
    }
    collectionsTimeoutRef.current = setTimeout(() => {
      setShowCollectionsDropdown(false);
    }, 300);
  };

  const handleLogout = () => {
    // Clear all tokens
    clearAuthTokens();
    setIsLoggedIn(false);
    setUserId(null);
    setCartItemCount(0);
    window.location.href = '/logout';
  };

  return (
    <>
      <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.headerContainer}>
          {/* Logo Section */}
          <div className={styles.logoSection}>
            <Link href="/" className={styles.logoLink}>
              <img
                src="/static_media/brakebee-logo.png"
                alt="Brakebee Logo"
                className={styles.logoImage}
                onError={(e) => {
                  // Fallback to existing logo if new one doesn't exist
                  e.target.src = '/static_media/logo.png';
                }}
              />
            </Link>
          </div>

          {/* Navigation Menu - Desktop */}
          <nav className={styles.navigation}>
            <Link href="/marketplace" className={styles.navLink}>
              Shop
            </Link>
            
            {/* Collections with Dropdown */}
            <div 
              className={styles.navLinkContainer}
              onMouseEnter={handleCollectionsEnter}
              onMouseLeave={handleCollectionsLeave}
            >
              <Link href="/collections" className={styles.navLink}>
                Collections
              </Link>
              {showCollectionsDropdown && categories.length > 0 && (
                <div 
                  className={styles.collectionsDropdown}
                  onMouseEnter={handleCollectionsEnter}
                  onMouseLeave={handleCollectionsLeave}
                >
                  <div className={styles.categoriesGrid}>
                    {categories.map(category => (
                      <div key={category.id} className={styles.categoryColumn}>
                        <Link 
                          href={`/category/${category.id}`} 
                          className={styles.parentCategoryLink}
                        >
                          {category.name}
                        </Link>
                        {category.children && category.children.length > 0 && (
                          <div className={styles.childCategories}>
                            {category.children.map(child => (
                              <Link 
                                key={child.id}
                                href={`/category/${child.id}`} 
                                className={styles.childCategoryLink}
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/events" className={styles.navLink}>
              Events
            </Link>
            <Link href="/artists" className={styles.navLink}>
              Meet the Artists
            </Link>
          </nav>

          {/* Right Side Container */}
          <div className={styles.rightSideContainer}>
            {/* Utility Section */}
            <div className={styles.utilitySection}>
            {/* AI Search Button */}
            <button 
              className={styles.aiSearchButton} 
              onClick={() => handleSearchModalOpen()}
              title="Search with AI"
            >
              <svg className={styles.magnifierIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <span className={styles.searchText}>Search Brakebee</span>
            </button>

            {/* Cart Icon - if logged in */}
            {isLoggedIn && !isLoading && (
              <div className={styles.cartContainer}>
                <Link href="/cart" className={styles.cartLink}>
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

            {/* Sign In / User Menu */}
            {isLoggedIn && userId && !isLoading ? (
              <div 
                className={styles.userMenuContainer}
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                <button className={styles.userButton}>
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
              <button 
                className={`${styles.bbBtn} ${styles.signInButton}`}
                onClick={() => window.location.href = '/login'}
              >
                Sign In
              </button>
            ) : (
              <div className={styles.loadingText}>Loading...</div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className={`${styles.mobileMenuToggle} mobile-menu-container`}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle mobile menu"
            >
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
            </button>
            </div>

            {/* Stacked Links Section */}
            <div className={styles.stackedLinksSection}>
              <button className={styles.stackedButton} onClick={() => window.location.href = '/artists/sell'}>
                For Artists
              </button>
              <button className={styles.stackedButton} onClick={() => window.location.href = '/promoter'}>
                For Festival Promoters
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {showMobileMenu && (
          <div className={`${styles.mobileMenuPanel} mobile-menu-container`}>
            <nav className={styles.mobileNavigation}>
              <Link href="/marketplace" className={styles.mobileNavLink}>
                Shop
              </Link>
              <Link href="/collections" className={styles.mobileNavLink}>
                Collections
              </Link>
              <Link href="/events" className={styles.mobileNavLink}>
                Events
              </Link>
              <Link href="/artists" className={styles.mobileNavLink}>
                Meet the Artists
              </Link>
              <div className={styles.mobileStackedLinks}>
                <Link href="/collections" className={styles.mobileNavLink}>
                  Shop Collections
                </Link>
                <Link href="/artists/sell" className={styles.mobileNavLink}>
                  For Artists
                </Link>
                <Link href="/promoter" className={styles.mobileNavLink}>
                  For Festival Promoters
                </Link>
              </div>
              {!isLoggedIn && (
                <button 
                  className={`${styles.bbBtn} ${styles.mobileSignInButton}`}
                  onClick={() => window.location.href = '/login'}
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Search Modal */}
      <SearchModal 
        isOpen={showSearchModal}
        onClose={() => {
          setShowSearchModal(false);
          setSearchQuery('');
        }}
        query={searchQuery}
        userId={userId}
      />

      {/* Impersonation Exit Button (floats when active) */}
      <ImpersonationExitButton />
    </>
  );
}
