'use client';
import Link from 'next/link';
import styles from './DashboardFooter.module.css';

const footerLinks = [
  { href: '/help', label: 'Help Center' },
  { href: '/policies/shipping', label: 'Shipping Policy' },
  { href: '/policies/returns', label: 'Returns & Exchanges' },
  { href: '/policies/terms', label: 'Terms of Service' },
  { href: '/policies/privacy', label: 'Privacy Policy' },
  { href: '/policies/cookies', label: 'Cookie Preferences' },
  { href: '/policies/copyright', label: 'Copyright Policy' },
  { href: '/policies/transparency', label: 'Marketplace Transparency' },
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
