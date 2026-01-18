'use client';
import Link from 'next/link';
import styles from './DashboardFooter.module.css';

const footerLinks = [
  { href: '/help', label: 'Help Center' },
  { href: '/shipping-policy', label: 'Shipping Policy' },
  { href: '/returns-exchanges', label: 'Returns & Exchanges' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/cookie-preferences', label: 'Cookie Preferences' },
  { href: '/copyright-policy', label: 'Copyright Policy' },
  { href: '/marketplace-transparency', label: 'Marketplace Transparency' },
];

export default function DashboardFooter() {
  return (
    <footer className={styles.dashboardFooter}>
      <div className={styles.footerContainer}>
        <hr className={styles.footerDivider} />
        
        <nav className={styles.footerLinks}>
          {footerLinks.map((link, index) => (
            <Link key={link.href} href={link.href} className={styles.footerLink}>
              {link.label}
            </Link>
          ))}
        </nav>
        
        <hr className={styles.footerDivider} />
        
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Brakebee & Online Art Festival LLC
        </p>
      </div>
    </footer>
  );
}
