import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { config, getFrontendUrl } from '../../lib/config';

export default function StorefrontHeader({ siteData, siteUrl, subdomain }) {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [pages, setPages] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  const currentPath = router.asPath;
  const displayName = siteData.business_name || siteData.display_name || `${siteData.first_name} ${siteData.last_name}`;

  useEffect(() => {
    if (!subdomain) return;
    const apiUrl = config.API_BASE_URL;

    Promise.all([
      fetch(`${apiUrl}/api/v2/websites/resolve/${subdomain}/articles?type=menu`).then(r => r.ok ? r.json() : []),
      fetch(`${apiUrl}/api/v2/websites/resolve/${subdomain}/articles?type=pages`).then(r => r.ok ? r.json() : [])
    ]).then(([arts, pgs]) => {
      setArticles(Array.isArray(arts) ? arts : []);
      setPages(Array.isArray(pgs) ? pgs : []);
    }).catch(err => console.error('Error loading nav data:', err));
  }, [subdomain]);

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          {siteData.logo_path ? (
            <Link href={siteUrl} className="site-logo">
              <img
                src={siteData.logo_path}
                alt={`${displayName} Logo`}
                style={{ maxHeight: '75px', width: 'auto', display: 'block' }}
              />
            </Link>
          ) : (
            <Link href={siteUrl} className="site-logo">{displayName}</Link>
          )}

          <nav className="site-nav">
            <Link href="/" className={`nav-link${currentPath === '/' ? ' active' : ''}`}>Home</Link>
            <Link href="/products" className={`nav-link${currentPath === '/products' ? ' active' : ''}`}>Shop</Link>
            <Link href="/about" className={`nav-link${currentPath === '/about' ? ' active' : ''}`}>About</Link>

            {articles.map(article => (
              <Link key={article.id} href={`/${article.slug}`} className={`nav-link${currentPath === `/${article.slug}` ? ' active' : ''}`}>
                {article.title}
              </Link>
            ))}

            {pages.filter(p => p.page_type === 'contact').map(page => (
              <Link key={page.id} href={`/${page.slug}`} className={`nav-link${currentPath === `/${page.slug}` ? ' active' : ''}`}>
                {page.title}
              </Link>
            ))}

            <button
              onClick={() => setShowCartModal(true)}
              className="nav-link"
              title="Shopping Cart"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              Cart
            </button>

            <button
              onClick={() => setShowAccountModal(true)}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Account
            </button>
          </nav>
        </div>
      </header>

      {/* Cart Modal */}
      {showCartModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowCartModal(false)}
        >
          <div
            style={{
              background: 'var(--background-color, #fff)',
              color: 'var(--text-color, #333)',
              borderRadius: 'var(--border-radius, 8px)',
              maxWidth: '720px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              fontFamily: 'var(--body-font, sans-serif)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Branded header */}
            <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(128,128,128,0.15)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--header-font, var(--body-font, sans-serif))' }}>
                    {displayName} uses the Brakebee global cart system.
                  </h3>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.4 }}>
                    Manage all your art purchases in one place with Brakebee.
                  </p>
                </div>
                <button
                  onClick={() => setShowCartModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, opacity: 0.5, color: 'inherit', padding: '0 0 0 1rem', flexShrink: 0 }}
                  aria-label="Close cart"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Cart iframe */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <iframe
                src={`${getFrontendUrl('/cart')}?embed=1`}
                style={{
                  width: '100%',
                  height: '65vh',
                  border: 'none',
                  display: 'block',
                }}
                title="Shopping Cart"
              />
            </div>

            {/* Footer actions */}
            <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(128,128,128,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <a
                href={getFrontendUrl('/cart')}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.85rem', color: 'var(--main-color, #333)', textDecoration: 'underline', opacity: 0.7 }}
              >
                Open full cart on Brakebee
              </a>
              <button
                onClick={() => setShowCartModal(false)}
                style={{ background: 'var(--main-color, #333)', color: 'var(--background-color, #fff)', border: 'none', padding: '8px 20px', borderRadius: 'var(--border-radius, 6px)', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAccountModal(false)}
        >
          <div
            style={{ background: 'var(--background-color, #fff)', color: 'var(--text-color, #333)', borderRadius: 'var(--border-radius, 8px)', padding: '2rem', maxWidth: '380px', width: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', fontFamily: 'var(--body-font, sans-serif)' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>This site is powered by</p>
            <img src={getFrontendUrl('/static_media/brakebee-logo.png')} alt="Brakebee" style={{ maxHeight: '40px', marginBottom: '1.5rem' }} />
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
              You are about to be redirected to manage your customer account.
            </p>
            <a
              href={getFrontendUrl('/dashboard')}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', background: 'var(--main-color, #333)', color: 'var(--background-color, #fff)', padding: '12px 24px', borderRadius: 'var(--border-radius, 8px)', textDecoration: 'none', fontWeight: 500 }}
            >
              Go to My Account
            </a>
            <button
              onClick={() => setShowAccountModal(false)}
              style={{ display: 'block', margin: '1rem auto 0', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '0.85rem', color: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
