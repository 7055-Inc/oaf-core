'use client';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import styles from './Help.module.css';

// Quick links configuration - links to help sections
const QUICK_LINKS = [
  { icon: 'fa-rocket', label: 'Getting Started', href: '/help/getting-started', description: 'New to Brakebee? Start here' },
  { icon: 'fa-user-cog', label: 'Account & Profile', href: '/help/account-profile', description: 'Settings, preferences, security' },
  { icon: 'fa-truck', label: 'Orders & Shipping', href: '/help/orders-shipping', description: 'Track orders, shipping info' },
  { icon: 'fa-undo', label: 'Returns & Refunds', href: '/help/returns-refunds', description: 'Return policy, refund process' },
  { icon: 'fa-calendar-alt', label: 'Events', href: '/help/events', description: 'Art fairs, markets, applications' },
  { icon: 'fa-store', label: 'Marketplace', href: '/help/marketplace', description: 'Selling, vendor setup, listings' },
  { icon: 'fa-credit-card', label: 'Payments & Billing', href: '/help/payments-billing', description: 'Payment methods, invoices' },
  { icon: 'fa-wrench', label: 'Technical Support', href: '/help/technical', description: 'Troubleshooting, browser support' },
];

export default function HelpCenterPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/articles?topic=help&search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <Head>
        <title>Help Center - Brakebee</title>
        <meta name="description" content="Get help with orders, returns, payments, selling, and more. Browse help articles or contact our support team." />
        <link rel="canonical" href="https://brakebee.com/help" />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Help Center' }
          ]} />

          {/* Hero Section */}
          <div className={styles.hero}>
            <h1>Help Center</h1>
            <p className={styles.heroSubtitle}>How can we help you today?</p>
            
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.searchWrapper}>
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <button type="submit" className={styles.searchButton}>
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Quick Links Grid */}
          <section className={styles.section}>
            <h2>Browse by Topic</h2>
            <div className={styles.quickLinksGrid}>
              {QUICK_LINKS.map((link, index) => (
                <Link key={index} href={link.href} className={styles.quickLinkCard}>
                  <div className={styles.quickLinkIcon}>
                    <i className={`fas ${link.icon}`}></i>
                  </div>
                  <div className={styles.quickLinkContent}>
                    <h3>{link.label}</h3>
                    <p>{link.description}</p>
                  </div>
                  <i className={`fas fa-chevron-right ${styles.quickLinkArrow}`}></i>
                </Link>
              ))}
            </div>
          </section>

          {/* Need More Help Section */}
          <section className={styles.section}>
            <h2>Need More Help?</h2>
            <div className={styles.helpOptionsGrid}>
              <Link href="/help/contact" className={styles.helpOptionCard}>
                <div className={styles.helpOptionIcon}>
                  <i className="fas fa-envelope"></i>
                </div>
                <h3>Contact Us</h3>
                <p>Send us a message and we'll get back to you</p>
              </Link>
              
              <Link href="/help/tickets" className={styles.helpOptionCard}>
                <div className={styles.helpOptionIcon}>
                  <i className="fas fa-ticket"></i>
                </div>
                <h3>My Tickets</h3>
                <p>View and manage your support requests</p>
              </Link>
            </div>
          </section>

          <div className={styles.backLink}>
            <Link href="/">← Back to Home</Link>
          </div>

        </div>
      </div>
    </>
  );
}

