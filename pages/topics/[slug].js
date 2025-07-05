import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from '../articles/styles/ArticleArchive.module.css';

export default function TopicPage() {
  const [topic, setTopic] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    if (slug) {
      fetchTopic();
    }
  }, [slug]);

  useEffect(() => {
    if (topic) {
      fetchArticles();
    }
  }, [topic, pagination.page]);

  const fetchTopic = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://api2.onlineartfestival.com/api/topics/${slug}`);
      const data = await response.json();
      
      if (data.topic) {
        setTopic(data.topic);
      } else {
        setError('Topic not found');
      }
    } catch (err) {
      console.error('Error fetching topic:', err);
      setError('Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await fetch(`https://api2.onlineartfestival.com/api/topics/${topic.id}/articles?page=${pagination.page}&limit=${pagination.limit}&status=published`);
      const data = await response.json();
      
      if (data.articles) {
        setArticles(data.articles);
        setPagination(prev => ({ ...prev, total: data.total || 0 }));
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Failed to load articles');
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading topic...</div>
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

  if (!topic) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>Topic not found</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{topic.meta_title || `${topic.name} - Online Art Festival`}</title>
        <meta name="description" content={topic.meta_description || topic.description} />
        <link rel="canonical" href={`https://onlineartfestival.com/topics/${topic.slug}`} />
        
        <meta property="og:title" content={topic.meta_title || `${topic.name} - Online Art Festival`} />
        <meta property="og:description" content={topic.meta_description || topic.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://onlineartfestival.com/topics/${topic.slug}`} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={topic.meta_title || `${topic.name} - Online Art Festival`} />
        <meta name="twitter:description" content={topic.meta_description || topic.description} />
      </Head>

      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.heroSection}>
            <div className={styles.heroContent}>
              <nav style={{ marginBottom: '20px', textAlign: 'left' }}>
                <Link href="/topics" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>
                  <i className="fas fa-arrow-left"></i> Back to Topics
                </Link>
              </nav>
              <h1 className={styles.heroTitle}>{topic.name}</h1>
              <p className={styles.heroDescription}>{topic.description}</p>
            </div>
          </div>

          {articles.length > 0 ? (
            <section className={styles.articlesSection}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-newspaper"></i>
                Articles in {topic.name}
              </h2>
              <div className={styles.articlesGrid}>
                {articles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={styles.pageButton}
                  >
                    <i className="fas fa-chevron-left"></i>
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`${styles.pageButton} ${pagination.page === page ? styles.active : ''}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === totalPages}
                    className={styles.pageButton}
                  >
                    Next
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  
                  <div className={styles.pageInfo}>
                    Page {pagination.page} of {totalPages} ({pagination.total} total articles)
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <i className="fas fa-newspaper"></i>
              </div>
              <h2 className={styles.emptyStateTitle}>No Articles Found</h2>
              <p className={styles.emptyStateDescription}>
                There are no published articles in this topic yet. Check back soon for new content.
              </p>
            </div>
          )}

          {topic.recent_articles && topic.recent_articles.length > 0 && (
            <section className={styles.articlesSection}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-clock"></i>
                Recent Articles
              </h2>
              <div className={styles.articlesGrid}>
                {topic.recent_articles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function ArticleCard({ article }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getReadingTime = (minutes) => {
    if (!minutes || minutes < 1) return '< 1 min read';
    return `${Math.round(minutes)} min read`;
  };

  return (
    <Link href={`/articles/${article.slug}`} className={styles.articleCard}>
      <div className={styles.articleImage}>
        <i className="fas fa-image"></i>
      </div>
      <div className={styles.articleContent}>
        <h3 className={styles.articleTitle}>{article.title}</h3>
        <p className={styles.articleExcerpt}>{article.excerpt}</p>
        
        <div className={styles.articleMeta}>
          <div className={styles.articleAuthor}>
            {article.author_display_name || article.author_username}
          </div>
          <div className={styles.articleDate}>
            {formatDate(article.published_at)}
          </div>
        </div>
        
        <div className={styles.articleStats}>
          <div className={styles.statItem}>
            <i className="fas fa-eye"></i>
            {article.view_count || 0} views
          </div>
          <div className={styles.statItem}>
            <i className="fas fa-clock"></i>
            {getReadingTime(article.reading_time_minutes)}
          </div>
        </div>
      </div>
    </Link>
  );
} 