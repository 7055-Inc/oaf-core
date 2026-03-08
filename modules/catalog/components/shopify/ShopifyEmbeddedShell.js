/**
 * Lightweight shell for the Shopify embedded app iframe.
 * Minimal branding bar + link to full Brakebee dashboard.
 */

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://brakebee.com';

export default function ShopifyEmbeddedShell({ children, shopDomain, onOpenDashboard }) {
  function handleOpenDashboard() {
    if (onOpenDashboard) {
      onOpenDashboard();
    } else {
      window.open(`${FRONTEND_URL}/dashboard/catalog/addons/shopify`, '_blank');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Slim branding bar */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e8e8e8',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={`${FRONTEND_URL}/images/logo.png`} alt="Brakebee" style={{ height: '22px' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }} />
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#222', display: 'none' }}>Brakebee</span>
        </div>
        <a
          href={`${FRONTEND_URL}/dashboard/catalog/addons/shopify`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => { e.preventDefault(); handleOpenDashboard(); }}
          style={{ fontSize: '12px', color: '#555', textDecoration: 'none', cursor: 'pointer' }}
        >
          Open Brakebee Dashboard &rarr;
        </a>
      </div>

      {/* Content */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
    </div>
  );
}
