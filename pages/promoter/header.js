import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ImpersonationExitButton from '../../components/ImpersonationExitButton';
import styles from './styles.module.css';

export default function PromoterHeader({ 
  logo = "/static_media/brakebee-logo.png", 
  logoLink = "/",
  title = "Promoter Landing", 
  navigation = [
    { label: "Features", href: "/promoter/features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Future Tools", href: "#future-tools" },
    { label: "Pricing", href: "#pricing" },
    { label: "Contact Us", href: "#contact" }
  ], 
  primaryButton = { text: "Watch a Demo", href: "/demo" },
  secondaryButton = { text: "Post your event FREE", href: "/login" },
  backgroundColor = "#ffffff",
  textColor = "#333333",
  sticky = true 
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!sticky) return;
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sticky]);

  const headerStyle = {
    position: sticky ? 'fixed' : 'relative',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: backgroundColor,
    color: textColor,
    padding: isScrolled ? '0.5rem 0' : '1rem 0',
    transition: 'all 0.3s ease',
    boxShadow: isScrolled ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
    borderBottom: isScrolled ? 'none' : '1px solid rgba(0,0,0,0.1)'
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const logoSectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  };

  const logoStyle = {
    width: '150px',
    height: 'auto',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    marginBottom: '0.25rem'
  };

  const logoLinkStyle = {
    textDecoration: 'none',
    display: 'block'
  };

  const poweredByStyle = {
    fontSize: '0.75rem',
    color: '#666666',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: '400',
    maxWidth: '150px',
    lineHeight: 1.2
  };

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    listStyle: 'none',
    margin: 0,
    padding: 0
  };

  const navItemStyle = {
    textDecoration: 'none',
    color: textColor,
    fontWeight: '500',
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '0.95rem',
    transition: 'color 0.3s ease',
    cursor: 'pointer'
  };

  const buttonsContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  };

  const hamburgerStyle = {
    display: 'none',
    flexDirection: 'column',
    cursor: 'pointer',
    padding: '0.5rem',
    gap: '4px'
  };

  const hamburgerLineStyle = {
    width: '25px',
    height: '3px',
    backgroundColor: textColor,
    transition: 'all 0.3s ease',
    borderRadius: '2px'
  };

  const mobileMenuStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: backgroundColor,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    padding: '1rem',
    display: isMobileMenuOpen ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '1rem',
    zIndex: 999
  };

  const mobileNavStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem'
  };

  const mobileNavItemStyle = {
    ...navItemStyle,
    padding: '0.75rem',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    textAlign: 'center'
  };

  const mobileButtonsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  };

  const mobileButtonStyle = {
    width: '100%',
    textAlign: 'center',
    padding: '0.75rem 1rem'
  };


  const handleNavClick = (item) => {
    if (item.href) {
      if (item.href.startsWith('http')) {
        window.open(item.href, '_blank');
      } else {
        router.push(item.href);
      }
    } else if (item.onClick) {
      item.onClick();
    }
  };

  const handlePrimaryButtonClick = () => {
    if (primaryButton?.href) {
      if (primaryButton.href.startsWith('http')) {
        window.open(primaryButton.href, '_blank');
      } else {
        router.push(primaryButton.href);
      }
    } else if (primaryButton?.onClick) {
      primaryButton.onClick();
    }
  };

  const handleSecondaryButtonClick = () => {
    if (secondaryButton?.href) {
      if (secondaryButton.href.startsWith('http')) {
        window.open(secondaryButton.href, '_blank');
      } else {
        router.push(secondaryButton.href);
      }
    } else if (secondaryButton?.onClick) {
      secondaryButton.onClick();
    }
  };

  const handleLogoClick = () => {
    if (logoLink.startsWith('http')) {
      window.open(logoLink, '_blank');
    } else {
      router.push(logoLink);
    }
  };

  return (
    <>
      <header style={headerStyle}>
        <div style={containerStyle}>
          {/* Logo Section */}
          <div style={logoSectionStyle}>
            <a 
              style={logoLinkStyle}
              onClick={handleLogoClick}
              title="Go to main site"
            >
              <img 
                src={logo} 
                alt="Brakebee Logo" 
                style={logoStyle}
                onError={(e) => {
                  // Fallback to existing logo if new one doesn't exist
                  e.target.src = '/static_media/logo.png';
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              />
            </a>
            <div style={poweredByStyle}>
              Powered by Leo Art AI
            </div>
          </div>

          {/* Desktop Navigation */}
          {navigation.length > 0 && (
            <nav className="desktop-nav">
              <ul style={navStyle}>
                {navigation.map((item, index) => (
                  <li key={index}>
                    <a
                      style={navItemStyle}
                      onClick={() => handleNavClick(item)}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#055474';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = textColor;
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Desktop Buttons */}
          <div style={buttonsContainerStyle} className="desktop-buttons">
            {secondaryButton && (
              <button
                className={styles.secondaryButton}
                onClick={handleSecondaryButtonClick}
              >
                {secondaryButton.text}
              </button>
            )}
            
            {primaryButton && (
              <button
                className={styles.primaryButton}
                onClick={handlePrimaryButtonClick}
              >
                {primaryButton.text}
              </button>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <div 
            style={hamburgerStyle} 
            className="mobile-hamburger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <div style={{
              ...hamburgerLineStyle,
              transform: isMobileMenuOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none'
            }} />
            <div style={{
              ...hamburgerLineStyle,
              opacity: isMobileMenuOpen ? 0 : 1
            }} />
            <div style={{
              ...hamburgerLineStyle,
              transform: isMobileMenuOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none'
            }} />
          </div>
        </div>

        {/* Mobile Menu */}
        <div style={mobileMenuStyle}>
          {navigation.length > 0 && (
            <nav style={mobileNavStyle}>
              {navigation.map((item, index) => (
                <a
                  key={index}
                  style={mobileNavItemStyle}
                  onClick={() => {
                    handleNavClick(item);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          <div style={mobileButtonsStyle}>
            {secondaryButton && (
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  handleSecondaryButtonClick();
                  setIsMobileMenuOpen(false);
                }}
              >
                {secondaryButton.text}
              </button>
            )}
            
            {primaryButton && (
              <button
                className={styles.primaryButton}
                onClick={() => {
                  handlePrimaryButtonClick();
                  setIsMobileMenuOpen(false);
                }}
              >
                {primaryButton.text}
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* Spacer for fixed header */}
      {sticky && (
        <div style={{ height: isScrolled ? '70px' : '90px', transition: 'height 0.3s ease' }} />
      )}

      {/* Impersonation Exit Button (floats when active) */}
      <ImpersonationExitButton />

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          
          .desktop-buttons {
            display: none !important;
          }
          
          .mobile-hamburger {
            display: flex !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-hamburger {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
