import { useRouter } from 'next/router';

export default function PromoterFooter({ 
  companyName = "Brakebee",
  logo = null,
  description = "Powered by Leo Art AI",
  links = [],
  socialLinks = [],
  contactInfo = {},
  backgroundColor = "#3e1c56",
  textColor = "#ffffff",
  accentColor = "#055474",
  showCopyright = true,
  customContent = null
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

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
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  };

  const logoSectionStyle = {
    ...sectionStyle,
    maxWidth: '300px'
  };

  const titleStyle = {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: accentColor
  };

  const linkStyle = {
    color: textColor,
    textDecoration: 'none',
    transition: 'color 0.3s ease',
    cursor: 'pointer'
  };

  const socialLinksStyle = {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  };

  const socialLinkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: accentColor,
    color: 'white',
    textDecoration: 'none',
    transition: 'all 0.3s ease'
  };

  const copyrightStyle = {
    borderTop: `1px solid ${textColor}33`,
    paddingTop: '1rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    opacity: 0.8
  };

  const handleLinkClick = (link) => {
    if (link.href) {
      if (link.href.startsWith('http')) {
        window.open(link.href, '_blank');
      } else {
        router.push(link.href);
      }
    } else if (link.onClick) {
      link.onClick();
    }
  };

  const handleSocialClick = (social) => {
    if (social.url) {
      window.open(social.url, '_blank');
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
            {logo ? (
              <img 
                src={logo} 
                alt={companyName} 
                style={{ height: '50px', marginBottom: '1rem' }}
              />
            ) : (
              <h3 style={{ ...titleStyle, fontSize: '1.5rem', margin: 0 }}>
                {companyName}
              </h3>
            )}
            
            {description && (
              <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.9 }}>
                {description}
              </p>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div style={socialLinksStyle}>
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    style={socialLinkStyle}
                    onClick={() => handleSocialClick(social)}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = textColor;
                      e.target.style.color = backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = accentColor;
                      e.target.style.color = 'white';
                    }}
                    title={social.name}
                  >
                    {social.icon || social.name.charAt(0).toUpperCase()}
                  </a>
                ))}
              </div>
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
              {contactInfo.address && (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  {contactInfo.address}
                </p>
              )}
              {contactInfo.phone && (
                <a 
                  href={`tel:${contactInfo.phone}`}
                  style={linkStyle}
                  onMouseEnter={(e) => {
                    e.target.style.color = accentColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = textColor;
                  }}
                >
                  {contactInfo.phone}
                </a>
              )}
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

          {/* Custom Content */}
          {customContent && (
            <div style={sectionStyle}>
              {customContent}
            </div>
          )}
        </div>

        {/* Copyright */}
        {showCopyright && (
          <div style={copyrightStyle}>
            <p style={{ margin: 0 }}>
              © {currentYear} {companyName}. All rights reserved.
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}
