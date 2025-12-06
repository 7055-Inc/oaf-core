'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';

// Transform API response to flat items array
const transformApiResponse = (apiData) => {
  if (!apiData || !apiData.flat_categories || !Array.isArray(apiData.flat_categories)) {
    return null;
  }
  
  // Convert flat categories to items format, limit to 15 (more space now)
  const items = apiData.flat_categories
    .filter(cat => cat.name && cat.id)
    .slice(0, 15)
    .map(cat => ({
      label: cat.name,
      href: `/category/${cat.id}`
    }));
  
  return { items };
};

// Utility functions
const sanitizeHref = (href) => {
  if (typeof href !== 'string') return '#';
  
  // Allow relative paths starting with /
  if (href.startsWith('/')) return href;
  
  // Allow absolute HTTPS URLs to brakebee.com
  if (href.startsWith('https://brakebee.com/')) return href;
  
  // Otherwise return safe fallback
  return '#';
};

const validateSchema = (data) => {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.items)) return false;
  
  return data.items.every(item => {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.label !== 'string') return false;
    if (typeof item.href !== 'string') return false;
    return true;
  });
};

const validateApiSchema = (data) => {
  if (!data || typeof data !== 'object') return false;
  if (!data.success) return false;
  if (!Array.isArray(data.flat_categories)) return false;
  return true;
};

const CACHE_KEY = 'bb.footer.categories.v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Dynamic Categories Chips Component
function CategoryChips({ endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/categories` }) {
  const [categories, setCategories] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async (useCache = true) => {
      try {
        // Check cache first
        if (useCache && typeof window !== 'undefined') {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            try {
              const { data, timestamp } = JSON.parse(cached);
              const age = Date.now() - timestamp;
              
              if (age < CACHE_DURATION && validateSchema(data)) {
                setCategories(data.items);
                setIsLoading(false);
                
                // Background refresh if stale
                if (age > CACHE_DURATION / 2) {
                  fetchCategories(false);
                }
                return;
              }
            } catch (e) {
              // Invalid cache, continue with fetch
            }
          }
        }

        // Fetch from API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const apiData = await response.json();

        // Validate and transform API response
        if (validateApiSchema(apiData)) {
          const transformedData = transformApiResponse(apiData);
          
          if (transformedData && validateSchema(transformedData)) {
            // Cache successful response
            if (typeof window !== 'undefined') {
              localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: transformedData,
                timestamp: Date.now()
              }));
            }

            setCategories(transformedData.items);
            setIsLoading(false);
          } else {
            throw new Error('Invalid transformed data');
          }
        } else {
          throw new Error('Invalid API schema');
        }

      } catch (error) {
        console.log('Categories API failed:', error.message);
        
        // No fallback - show unavailable
        setCategories(null);
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [endpoint]);

  if (isLoading) {
    return (
      <nav className={styles.bbCats} aria-label="Browse Categories">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <div key={i} className={styles.skeletonChip}></div>
        ))}
      </nav>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <nav className={styles.bbCats} aria-label="Browse Categories">
        <span className={styles.bbChip}>Categories unavailable</span>
      </nav>
    );
  }

  return (
    <nav className={styles.bbCats} aria-label="Browse Categories">
      {categories.map((item, index) => (
        <Link key={index} href={sanitizeHref(item.href)} className={styles.bbChip}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className={styles.bbFooter}>
      <div className={styles.bbFooterWrap}>
        
        {/* Row 1: Link Rail */}
        <div className={styles.bbFooterRail}>
          
          {/* Left: Logo */}
          <div className={styles.bbRailLeft}>
            <Link href="/">
              <Image 
                src="/static_media/brakebee-logo.png" 
                alt="Brakebee Logo" 
                width={140}
                height={52}
                className={styles.bbLogoB}
                quality={75}
                priority={false}
              />
            </Link>
          </div>

          {/* Center: Dynamic Categories + Discovery */}
          <div className={styles.bbRailCenter}>
            <CategoryChips />
          </div>

          {/* Right: Social Icons */}
          <div className={styles.bbRailRight}>
            <nav className={styles.bbSocial} aria-label="Social">
              <a aria-label="Instagram" href="https://instagram.com/brakebee" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a aria-label="Facebook" href="https://facebook.com/brakebee" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a aria-label="Pinterest" href="https://pinterest.com/brakebee" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.21.088.325-.095.401-.302 1.248-.343 1.423-.054.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-12.013C24.007 5.367 18.641.001 12.017.001z"/>
                </svg>
              </a>
              <a aria-label="TikTok" href="https://tiktok.com/@brakebee" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a aria-label="YouTube" href="https://youtube.com/@brakebee" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </nav>
          </div>

        </div>

        {/* Row 2: Policy Bar */}
        <div className={styles.bbFooterPolicy}>
          <span>© Brakebee — Curated by Leo Art AI</span>
          <span className={styles.dot}>•</span>
          <a href="mailto:marketplace@brakebee.com">Email Us</a>
          <span className={styles.dot}>•</span>
          <Link href="/policies/shipping">Shipping</Link>
          <span className={styles.dot}>•</span>
          <Link href="/policies/returns">Returns & Exchanges</Link>
          <span className={styles.dot}>•</span>
          <Link href="/policies/terms">Terms of Service</Link>
          <span className={styles.dot}>•</span>
          <Link href="/policies/privacy">Privacy Policy</Link>
          <span className={styles.dot}>•</span>
          <Link href="/policies/cookies">Cookie Preferences</Link>
          <span className={styles.dot}>•</span>
          <Link href="/policies/copyright">Copyright Policy</Link>
        </div>

      </div>

      {/* ActiveCampaign Tracking */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(e,t,o,n,p,r,i){e.visitorGlobalObjectAlias=n;e[e.visitorGlobalObjectAlias]=e[e.visitorGlobalObjectAlias]||function(){(e[e.visitorGlobalObjectAlias].q=e[e.visitorGlobalObjectAlias].q||[]).push(arguments)};e[e.visitorGlobalObjectAlias].l=(new Date).getTime();r=t.createElement("script");r.src=o;r.async=true;i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i)})(window,document,"https://diffuser-cdn.app-us1.com/diffuser/diffuser.js","vgo");
vgo('setAccount', '612842666');
vgo('setTrackByDefault', true);
vgo('process');
          `,
        }}
      />
      {/* End ActiveCampaign Tracking */}
    </footer>
  );
}