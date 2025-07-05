import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../../components/Header';
import styles from '../styles/ArticleArchive.module.css';

export default function TagArchivePage() {
  const router = useRouter();
  const { slug } = router.query;
  const [tag, setTag] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    
    Promise.all([
      fetch(`https://api2.onlineartfestival.com/api/tags/${slug}`).then(res => res.json()),
      fetch(`https://api2.onlineartfestival.com/api/articles?tag=${slug}&limit=${pagination.limit}&page=${pagination.page}`).then(res => res.json())
    ])
      .then(([tagData, articlesData]) => {
        setTag(tagData.tag || { name: slug, slug });
        setArticles(articlesData.articles || []);
        setPagination(prev => ({
          ...prev,
          total: articlesData.pagination?.total || 0,
          pages: articlesData.pagination?.pages || 0
        }));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading tag archive:', err);
        setError('Failed to load tag or articles');
        setLoading(false);
      });
  }, [slug, pagination.page]);

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

  if (loading) return (
    <div className={styles.container}>
      <Header />
      <div className={styles.loading}>Loading tag...</div>
    </div>
  );

  if (error) return (
    <div className={styles.container}>
      <Header />
      <div className={styles.error}>{error}</div>
    </div>
  );

  if (!tag) return (
    <div className={styles.container}>
      <Header />
      <div className={styles.error}>Tag not found</div>
    </div>
  );

  // SEO meta tags
  const metaTitle = `${tag.name} Articles - Online Art Festival`;
  const metaDescription = `Explore articles tagged with "${tag.name}" on Online Art Festival. Discover insights, techniques, and stories from our community of artists.`;
  const canonicalUrl = `https://onlineartfestival.com/articles/tag/${tag.slug}`;

  // Generate JSON-LD structured data
  const generateTagSchema = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Articles tagged: ${tag.name}`,
      "description": metaDescription,
      "url": canonicalUrl,
      "numberOfItems": pagination.total,
      "itemListElement": articles.map((article, index) => ({
        "@type": "Article",
        "position": index + 1,
        "name": article.title,
        "url": `https://onlineartfestival.com/articles/${article.slug}`,
        "author": {
          "@type": "Person",
          "name": article.author_display_name || article.author_username
        },
        "datePublished": article.published_at,
        "keywords": tag.name,
        "publisher": {
          "@type": "Organization",
          "name": "Online Art Festival",
          "url": "https://onlineartfestival.com"
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
        <meta name="keywords" content={`${tag.name}, articles, art, online art festival`} />
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
          dangerouslySetInnerHTML={{ __html: generateTagSchema() }}
        />
      </Head>

      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          {/* Tag Archive Hero Section */}
          <div className={styles.tagHeader}>
            <h1 className={styles.tagTitle}>#{tag.name}</h1>
            <div className={styles.tagBadge}>Tag</div>
            <div className={styles.topicMeta}>
              <span className={styles.articleCount}>{pagination.total} articles</span>
            </div>
          </div>

          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link href="/articles">Articles</Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>Tagged: {tag.name}</span>
          </nav>

          {/* Articles Grid */}
          <div className={styles.articlesSection}>
            <h2 className={styles.sectionTitle}>Articles tagged with "{tag.name}"</h2>
            
            {articles.length === 0 ? (
              <div className={styles.noArticles}>
                <p>No articles found with the tag "{tag.name}".</p>
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