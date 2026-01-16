'use client';
import Header from '../Header';
import Footer from '../Footer';
import ExitIntentPopup from '../ExitIntentPopup';

/**
 * MainLayout - Persistent layout for main site pages
 * 
 * This layout wraps all non-dashboard pages. The Header and Footer
 * stay mounted during client-side navigation, only the children swap out.
 * This provides a smoother, faster navigation experience.
 */
export default function MainLayout({ children }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <ExitIntentPopup />
    </>
  );
}

