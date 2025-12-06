'use client';
import Link from 'next/link';
import Head from 'next/head';
import styles from './Breadcrumb.module.css';

/**
 * Breadcrumb component with JSON-LD structured data for SEO
 * 
 * Usage:
 * <Breadcrumb items={[
 *   { label: 'Home', href: '/' },
 *   { label: 'Marketplace', href: '/marketplace' },
 *   { label: 'Paintings', href: '/category/123' },
 *   { label: 'Ocean Sunset' } // Current page (no href)
 * ]} />
 */
export default function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  // Generate JSON-LD structured data for Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      ...(item.href && { 
        "item": `https://brakebee.com${item.href}` 
      })
    }))
  };

  return (
    <>
      {/* JSON-LD for Google rich snippets */}
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      {/* Visual breadcrumb navigation */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol className={styles.list}>
          {items.map((item, index) => (
            <li key={index} className={styles.item}>
              {item.href ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              )}
              {index < items.length - 1 && (
                <span className={styles.separator} aria-hidden="true">/</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

