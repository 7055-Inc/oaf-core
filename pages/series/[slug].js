import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from './Series.module.css';

export default function SeriesPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [series, setSeries] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (slug) {
      fetchSeries();
    }
  }, [slug]);

  const fetchSeries = async () => {
    try {
      const response = await fetch(`https://api2.onlineartfestival.com/api/series/${slug}`);
      if (!response.ok) {
        throw new Error('Series not found');
      }
      const data = await response.json();
      setSeries(data.series);
      setArticles(data.articles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getReadingTime = (minutes) => {
    if (!minutes || minutes < 1) return '< 1 min read';
    return `${Math.round(minutes)} min read`;
  };

  // Generate JSON-LD structured data for series
  const generateSeriesSchema = () => {
    const canonicalUrl = `https://onlineartfestival.com/series/${series.slug}`;
    
    const schema = {
      "@context": "https://schema.org",
      "@type": "Series",
      "name": series.series_name,
      "description": series.description,
      "url": canonicalUrl,
      "publisher": {
        "@type": "Organization",
        "name": "Online Art Festival",
        "url": "https://onlineartfestival.com"
      },
      "dateCreated": series.created_at,
      "dateModified": series.updated_at || series.created_at
    };

    // Add articles as parts of the series
    if (articles.length > 0) {
      schema.hasPart = articles.map(article => ({
        "@type": "Article",
        "name": article.title,
        "url": `https://onlineartfestival.com/articles/${article.slug}`,
        "position": article.position_in_series,
        "author": {
          "@type": "Person",
          "name": article.author_display_name || article.author_username
        },
        "datePublished": article.published_at
      }));
    }

    return JSON.stringify(schema);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading series...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>Series not found</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{series.series_name} - Online Art Festival</title>
        <meta name="description" content={series.description} />
        <link rel="canonical" href={`https://onlineartfestival.com/series/${series.slug}`} />
        
        <meta property="og:title" content={series.series_name} />
        <meta property="og:description" content={series.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://onlineartfestival.com/series/${series.slug}`} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={series.series_name} />
        <meta name="twitter:description" content={series.description} />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: generateSeriesSchema() }}
        />
      </Head>
      
      <div className={styles.container}>
        <Header />
        
        <div className={styles.seriesContent}>
          <div className={styles.seriesHeader}>
            <nav className={styles.breadcrumb}>
              <Link href="/articles">Articles</Link>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbCurrent}>Series</span>
            </nav>
            
            <h1 className={styles.seriesTitle}>{series.series_name}</h1>
            
            {series.description && (
              <p className={styles.seriesDescription}>{series.description}</p>
            )}
            
            <div className={styles.seriesMeta}>
              <span className={styles.articleCount}>{articles.length} articles</span>
              <span className={styles.separator}>•</span>
              <span className={styles.createdDate}>Created {formatDate(series.created_at)}</span>
            </div>
          </div>

          <div className={styles.articlesGrid}>
            {articles.map((article, index) => (
              <div key={article.id} className={styles.articleCard}>
                <div className={styles.articlePosition}>
                  <span className={styles.positionNumber}>
                    {article.position_in_series}
                  </span>
                </div>
                
                <div className={styles.articleContent}>
                  <Link 
                    href={`/articles/${article.slug}`}
                    className={styles.articleLink}
                  >
                    <h2 className={styles.articleTitle}>{article.title}</h2>
                  </Link>
                  
                  {article.excerpt && (
                    <p className={styles.articleExcerpt}>{article.excerpt}</p>
                  )}
                  
                  <div className={styles.articleMeta}>
                    <span className={styles.authorName}>
                      {article.author_display_name || article.author_username}
                    </span>
                    <span className={styles.separator}>•</span>
                    <span className={styles.publishDate}>
                      {formatDate(article.published_at)}
                    </span>
                    {article.reading_time_minutes && (
                      <>
                        <span className={styles.separator}>•</span>
                        <span className={styles.readingTime}>
                          {getReadingTime(article.reading_time_minutes)}
                        </span>
                      </>
                    )}
                    {article.view_count && (
                      <>
                        <span className={styles.separator}>•</span>
                        <span className={styles.viewCount}>
                          {article.view_count} views
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {articles.length === 0 && (
            <div className={styles.noArticles}>
              <p>No articles in this series yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 