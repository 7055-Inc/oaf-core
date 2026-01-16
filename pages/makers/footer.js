import { useRouter } from 'next/router';

export default function MakersFooter({ 
  companyName = "Brakebee",
  description = "The marketplace built for artists and makers. Sell your work online, at events, or through your own storefront.",
  links = [
    { label: "Start Selling", href: "/signup", category: "Get Started" },
    { label: "Features", href: "/makers/features", category: "Get Started" },
    { label: "How It Works", href: "/makers#how-it-works", category: "Get Started" },
    { label: "Pricing", href: "/makers#pricing", category: "Get Started" },
    { label: "Browse Events", href: "/events", category: "Resources" },
    { label: "Help Center", href: "/help", category: "Resources" },
    { label: "Success Stories", href: "/makers#success-stories", category: "Resources" },
    { label: "Terms of Service", href: "/policies/terms", category: "Legal" },
    { label: "Privacy Policy", href: "/policies/privacy", category: "Legal" },
    { label: "Marketplace Terms", href: "/policies/marketplace", category: "Legal" }
  ],
  contactInfo = {},
  showCopyright = true
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  // Brakebee brand colors
  const primaryColor = '#055474';
  const secondaryColor = '#3E1C56';
  const backgroundColor = secondaryColor;
  const textColor = '#ffffff';
  const accentColor = primaryColor;

  const footerStyle = {
    backgroundColor: backgroundColor,
    color: textColor,
    padding: '3rem 0 1rem 0',
    marginTop: 'auto'
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem'
  };

  const mainContentStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  };

  const logoSectionStyle = {
    ...sectionStyle,
    maxWidth: '300px'
  };

  const titleStyle = {
    fontSize: '1rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Nunito Sans', sans-serif"
  };

  const linkStyle = {
    color: textColor,
    textDecoration: 'none',
    transition: 'color 0.3s ease',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontFamily: "'Nunito Sans', sans-serif"
  };

  const copyrightStyle = {
    borderTop: `1px solid rgba(255,255,255,0.2)`,
    paddingTop: '1rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    opacity: 0.8
  };

  const handleLinkClick = (link) => {
    if (link.href) {
      if (link.href.startsWith('http')) {
        window.open(link.href, '_blank');
      } else if (link.href.includes('#')) {
        const [path, hash] = link.href.split('#');
        if (path && path !== router.pathname) {
          router.push(link.href);
        } else {
          const element = document.querySelector(`#${hash}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } else {
        router.push(link.href);
      }
    }
  };

  // Group links by category
  const groupedLinks = links.reduce((acc, link) => {
    const category = link.category || 'Links';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  }, {});

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        <div style={mainContentStyle}>
          {/* Company Info Section */}
          <div style={logoSectionStyle}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              margin: 0, 
              color: textColor,
              fontFamily: "'Permanent Marker', cursive"
            }}>
              {companyName}
            </h3>
            
            {description && (
              <p style={{ 
                margin: 0, 
                lineHeight: 1.6, 
                opacity: 0.9, 
                fontSize: '0.95rem',
                fontFamily: "'Nunito Sans', sans-serif"
              }}>
                {description}
              </p>
            )}
          </div>

          {/* Link Sections */}
          {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
            <div key={category} style={sectionStyle}>
              <h4 style={titleStyle}>{category}</h4>
              {categoryLinks.map((link, index) => (
                <a
                  key={index}
                  style={linkStyle}
                  onClick={() => handleLinkClick(link)}
                  onMouseEnter={(e) => {
                    e.target.style.color = accentColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = textColor;
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}

          {/* Contact Info */}
          {Object.keys(contactInfo).length > 0 && (
            <div style={sectionStyle}>
              <h4 style={titleStyle}>Contact</h4>
              {contactInfo.email && (
                <a 
                  href={`mailto:${contactInfo.email}`}
                  style={linkStyle}
                  onMouseEnter={(e) => {
                    e.target.style.color = accentColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = textColor;
                  }}
                >
                  {contactInfo.email}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Copyright */}
        {showCopyright && (
          <div style={copyrightStyle}>
            <p style={{ margin: 0, fontFamily: "'Nunito Sans', sans-serif" }}>
              © {currentYear} {companyName}. All rights reserved. Powered by Leo Art AI.
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}
