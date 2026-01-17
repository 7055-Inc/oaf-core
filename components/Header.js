'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePageType } from '../hooks/usePageType';
import { getAuthToken, clearAuthTokens } from '../lib/auth';
import { authApiRequest, apiGet, API_ENDPOINTS } from '../lib/apiUtils';
import styles from './Header.module.css';

// Lazy load heavy components - only loaded when needed
const SearchModal = dynamic(() => import('./search').then(mod => ({ default: mod.SearchModal })), {
  ssr: false,
  loading: () => null
});

const ImpersonationExitButton = dynamic(() => import('./admin/ImpersonationExitButton'), {
  ssr: false,
  loading: () => null
});

// Cache keys and duration
const CATEGORIES_CACHE_KEY = 'header_categories_cache';
const CATEGORIES_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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

  // Fetch categories for Collections dropdown (with localStorage cache)
  // Only show Shop category's children (art medium categories)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Check localStorage cache first
        const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CATEGORIES_CACHE_DURATION) {
            setCategories(data);
            return; // Use cached data, skip API call
          }
        }

        // Fetch fresh data
        const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/categories`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          const allCategories = data.categories || [];
          
          // Find Shop category and use its children as the dropdown categories
          const shopCategory = allCategories.find(cat => cat.name === 'Shop' || cat.id === 7);
          const categoriesData = shopCategory?.children || [];
          
          setCategories(categoriesData);
          
          // Cache the result
          localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify({
            data: categoriesData,
            timestamp: Date.now()
          }));
        }
      } catch (err) {
        // Silent fail - categories dropdown just won't show
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
          {/* Logo Section - Using next/image for auto-optimization */}
          <div className={styles.logoSection}>
            <Link href="/" className={styles.logoLink}>
              <Image
                src="/static_media/brakebee-logo.png"
                alt="Brakebee Logo"
                width={200}
                height={75}
                className={styles.logoImage}
                priority={true}
                quality={85}
              />
            </Link>
          </div>

          {/* Navigation Menu - Desktop */}
          <nav className={styles.navigation}>
            {/* Browse Art with Dropdown */}
            <div 
              className={styles.navLinkContainer}
              onMouseEnter={handleCollectionsEnter}
              onMouseLeave={handleCollectionsLeave}
            >
              <span className={styles.navLink} style={{ cursor: 'pointer' }}>
                Browse Art
              </span>
              {showCollectionsDropdown && (
                <div 
                  className={styles.browseArtDropdown}
                  onMouseEnter={handleCollectionsEnter}
                  onMouseLeave={handleCollectionsLeave}
                >
                  {/* Browse by Category - with nested categories */}
                  <div className={styles.browseArtItem}>
                    <Link href="/collections" className={styles.browseArtLink}>
                      Browse by Category
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '8px' }}>
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </Link>
                    {categories.length > 0 && (
                      <div className={styles.categoriesSubmenu}>
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
                  
                  {/* Browse by Artist */}
                  <Link href="/artists" className={styles.browseArtLink}>
                    Browse by Artist
                  </Link>
                  
                  {/* New Arrivals */}
                  <Link href="/new-arrivals" className={styles.browseArtLink}>
                    New Arrivals
                  </Link>
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
              <svg className={styles.magnifierIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <span className={styles.searchText}>Search Brakebee</span>
            </button>

            {/* Cart Icon - if logged in */}
            {isLoggedIn && !isLoading && (
              <div className={styles.cartContainer}>
                <Link href="/cart" className={styles.cartLink} aria-label="Shopping cart">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
                onClick={() => {
                  const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
                  window.location.href = `/login?redirect=${currentUrl}`;
                }}
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
              <button className={styles.stackedButton} onClick={() => window.location.href = '/makers'}>
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
              {/* Browse Art Section */}
              <div className={styles.mobileMenuSection}>
                <span className={styles.mobileMenuSectionTitle}>Browse Art</span>
                <Link href="/collections" className={styles.mobileNavLinkIndent}>
                  By Category
                </Link>
                <Link href="/artists" className={styles.mobileNavLinkIndent}>
                  By Artist
                </Link>
                <Link href="/new-arrivals" className={styles.mobileNavLinkIndent}>
                  New Arrivals
                </Link>
              </div>
              
              <Link href="/events" className={styles.mobileNavLink}>
                Events
              </Link>
              
              <div className={styles.mobileStackedLinks}>
                <Link href="/makers" className={styles.mobileNavLink}>
                  For Artists
                </Link>
                <Link href="/promoter" className={styles.mobileNavLink}>
                  For Festival Promoters
                </Link>
              </div>
              {!isLoggedIn && (
                <button 
                  className={`${styles.bbBtn} ${styles.mobileSignInButton}`}
                  onClick={() => {
                    const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/login?redirect=${currentUrl}`;
                  }}
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Search Modal - only loads when opened */}
      {showSearchModal && (
      <SearchModal 
        isOpen={showSearchModal}
        onClose={() => {
          setShowSearchModal(false);
          setSearchQuery('');
        }}
        query={searchQuery}
        userId={userId}
      />
      )}

      {/* Impersonation Exit Button (floats when active) */}
      <ImpersonationExitButton />
    </>
  );
}
