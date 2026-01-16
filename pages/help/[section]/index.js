/**
 * Help Section Landing Page
 * Displays all help articles within a specific section
 */
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Breadcrumb from '../../../components/Breadcrumb';
import { apiRequest } from '../../../lib/apiUtils';
import styles from '../Help.module.css';

// Section metadata
const SECTION_META = {
  'getting-started': {
    title: 'Getting Started',
    description: 'New to Brakebee? Start here to learn the basics.',
    icon: 'fa-rocket'
  },
  'account-profile': {
    title: 'Account & Profile',
    description: 'Manage your account settings, profile, and preferences.',
    icon: 'fa-user-cog'
  },
  'orders-shipping': {
    title: 'Orders & Shipping',
    description: 'Track orders, shipping information, and delivery questions.',
    icon: 'fa-truck'
  },
  'returns-refunds': {
    title: 'Returns & Refunds',
    description: 'How to return items and request refunds.',
    icon: 'fa-undo'
  },
  'events': {
    title: 'Events',
    description: 'Information about art fairs, markets, and events.',
    icon: 'fa-calendar-alt'
  },
  'marketplace': {
    title: 'Marketplace',
    description: 'Selling on Brakebee, vendor setup, and marketplace policies.',
    icon: 'fa-store'
  },
  'payments-billing': {
    title: 'Payments & Billing',
    description: 'Payment methods, billing questions, and invoices.',
    icon: 'fa-credit-card'
  },
  'technical': {
    title: 'Technical Support',
    description: 'Technical issues, troubleshooting, and browser support.',
    icon: 'fa-wrench'
  }
};

export default function HelpSectionPage() {
  const router = useRouter();
  const { section } = router.query;
  
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sectionMeta = SECTION_META[section] || {
    title: section?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Help',
    description: 'Help articles in this section.',
    icon: 'fa-folder'
  };

  useEffect(() => {
    if (section) {
      fetchArticles();
    }
  }, [section]);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`api/articles?page_type=help_article&section=${section}&status=published`);
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  if (!section) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>{sectionMeta.title} - Help Center - Brakebee</title>
        <meta name="description" content={sectionMeta.description} />
        <link rel="canonical" href={`https://brakebee.com/help/${section}`} />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Help Center', href: '/help' },
            { label: sectionMeta.title }
          ]} />

          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <i className={`fas ${sectionMeta.icon}`}></i>
            </div>
            <div>
              <h1>{sectionMeta.title}</h1>
              <p>{sectionMeta.description}</p>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <i className="fas fa-spinner fa-spin"></i> Loading articles...
            </div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : articles.length === 0 ? (
            <div className={styles.emptySection}>
              <i className="fas fa-file-alt"></i>
              <h3>No articles yet</h3>
              <p>We're working on adding content to this section. Check back soon!</p>
              <Link href="/help" className={styles.backLink}>
                ← Back to Help Center
              </Link>
            </div>
          ) : (
            <div className={styles.articleList}>
              {articles.map(article => (
                <Link 
                  href={`/help/${section}/${article.slug}`} 
                  key={article.id}
                  className={styles.articleCard}
                >
                  <div className={styles.articleIcon}>
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <div className={styles.articleInfo}>
                    <h3>{article.title}</h3>
                    {article.excerpt && (
                      <p>{article.excerpt}</p>
                    )}
                  </div>
                  <div className={styles.articleArrow}>
                    <i className="fas fa-chevron-right"></i>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className={styles.sectionFooter}>
            <Link href="/help" className={styles.backLink}>
              ← Back to Help Center
            </Link>
            <Link href="/help/contact" className={styles.contactLink}>
              Can't find what you need? Contact us →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

