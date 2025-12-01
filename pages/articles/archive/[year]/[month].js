import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getApiUrl, getFrontendUrl } from '../../../../lib/config';
import styles from '../../styles/ArticleArchive.module.css';

export default function DateArchivePage() {
  const router = useRouter();
  const { year, month } = router.query;
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  useEffect(() => {
    if (!year || !month) return;
    setLoading(true);
    
    fetch(getApiUrl(`api/articles?year=${year}&month=${month}&limit=${pagination.limit}&page=${pagination.page}`))
      .then(res => res.json())
      .then(data => {
        setArticles(data.articles || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0
        }));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading date archive:', err);
        setError('Failed to load articles');
        setLoading(false);
      });
  }, [year, month, pagination.page]);

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

  const getMonthName = (monthNum) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(monthNum) - 1] || '';
  };

  if (loading) return (
    <div className={styles.container}>
      <div className={styles.loading}>Loading articles...</div>
    </div>
  );

  if (error) return (
    <div className={styles.container}>
      <div className={styles.error}>{error}</div>
    </div>
  );

  // SEO meta tags
  const monthName = getMonthName(month);
  const metaTitle = `Articles from ${monthName} ${year} - Online Art Festival`;
  const metaDescription = `Browse articles published in ${monthName} ${year} on Online Art Festival. Discover art insights, techniques, and stories from our community of artists.`;
  const canonicalUrl = getFrontendUrl(`/articles/archive/${year}/${month}`);

  // Generate JSON-LD structured data
  const generateDateArchiveSchema = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Articles from ${monthName} ${year}`,
      "description": metaDescription,
      "url": canonicalUrl,
      "numberOfItems": pagination.total,
      "itemListElement": articles.map((article, index) => ({
        "@type": "Article",
        "position": index + 1,
        "name": article.title,
        "url": getFrontendUrl(`/articles/${article.slug}`),
        "author": {
          "@type": "Person",
          "name": article.author_display_name || article.author_username
        },
        "datePublished": article.published_at,
        "publisher": {
          "@type": "Organization",
          "name": "Online Art Festival",
          "url": ""
        }
      }))
    };

    return JSON.stringify(schema);
  };

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: generateDateArchiveSchema() }}
        />
      </Head>

      <div className={styles.container}>
        
        <div className={styles.content}>
          {/* Date Archive Hero Section */}
          <div className={styles.dateHeader}>
            <h1 className={styles.dateTitle}>{monthName} {year}</h1>
            <p className={styles.dateRange}>
              Articles published during {monthName} {year}
            </p>
            <div className={styles.topicMeta}>
              <span className={styles.articleCount}>{pagination.total} articles</span>
            </div>
          </div>

          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link href="/articles">Articles</Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link href={`/articles/archive/${year}`}>{year}</Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{monthName}</span>
          </nav>

          {/* Articles Grid */}
          <div className={styles.articlesSection}>
            <h2 className={styles.sectionTitle}>Published in {monthName} {year}</h2>
            
            {articles.length === 0 ? (
              <div className={styles.noArticles}>
                <p>No articles were published in {monthName} {year}.</p>
              </div>
            ) : (
              <div className={styles.articlesGrid}>
                {articles.map(article => (
                  <div key={article.id} className={styles.articleCard}>
                    <Link href={`/articles/${article.slug}`} className={styles.articleLink}>
                      <h3 className={styles.articleTitle}>{article.title}</h3>
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
                        
                        {article.topics && (
                          <div className={styles.articleTopics}>
                            {article.topics.split(',').slice(0, 2).map((topic, index) => (
                              <span key={index} className={styles.topicTag}>
                                {topic.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className={styles.pagination}>
                {pagination.page > 1 && (
                  <button 
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className={styles.paginationButton}
                  >
                    Previous
                  </button>
                )}
                
                <span className={styles.paginationInfo}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                
                {pagination.page < pagination.pages && (
                  <button 
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className={styles.paginationButton}
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 