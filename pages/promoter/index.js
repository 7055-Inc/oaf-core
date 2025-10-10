import PromoterHeader from './header';
import PromoterFooter from './footer';

export default function PromoterLanding({ 
  // Header props (optional overrides)
  headerProps = {},
  
  // Page content (children or sections)
  children,
  
  // Footer props (optional overrides)  
  footerProps = {}
}) {

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <PromoterHeader {...headerProps} />

      {/* Page Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <PromoterFooter {...footerProps} />
    </div>
  );
}
