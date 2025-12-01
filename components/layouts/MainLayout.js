'use client';
import Header from '../Header';
import Footer from '../Footer';

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
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

