import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from './styles/ArticlesList.module.css';

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({
    topic: '',
    search: ''
  });

  useEffect(() => {
    fetchArticles();
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [pagination.page, filters]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: 'published'
      });
      
      if (filters.topic) {
        queryParams.append('topic', filters.topic);
      }
      
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      
      const response = await fetch(`https://api2.onlineartfestival.com/api/articles?${queryParams}`);
      const data = await response.json();
      
      if (data.articles) {
        setArticles(data.articles);
        setPagination(prev => ({ ...prev, total: data.pagination.total }));
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch('https://api2.onlineartfestival.com/api/articles/topics');
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (err) {
      console.error('Error fetching topics:', err);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && articles.length === 0) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading articles...</div>
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

  return (
    <>
      <Head>
        <title>Art & Culture Articles - Online Art Festival</title>
        <meta name="description" content="Explore our collection of art and culture articles, tutorials, and insights. Stay updated with the latest trends, techniques, and stories from the art world." />
                  <meta name="keywords" content="art articles, culture articles, art tutorials, artist stories, art techniques, creative insights, art news" />
        <link rel="canonical" href="https://onlineartfestival.com/articles" />
        
        <meta property="og:title" content="Art & Culture Articles - Online Art Festival" />
        <meta property="og:description" content="Explore our collection of art and culture articles, tutorials, and insights from the art world." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://onlineartfestival.com/articles" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Art & Culture Articles - Online Art Festival" />
        <meta name="twitter:description" content="Explore our collection of art and culture articles, tutorials, and insights from the art world." />
      </Head>

      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.heroSection}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Art & Culture Articles</h1>
              <p className={styles.heroDescription}>
                Discover inspiring stories, tutorials, and insights from the art world. 
                From technique guides to artist spotlights, explore creativity in all its forms.
              </p>
            </div>
          </div>

          <div className={styles.filterSection}>
            <h2 className={styles.filterTitle}>Find Articles</h2>
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Topic</label>
                <select 
                  value={filters.topic} 
                  onChange={(e) => handleFilterChange('topic', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Topics</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.slug}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search articles..."
                  className={styles.filterSelect}
                />
              </div>
              
              <button 
                onClick={() => {
                  setFilters({ topic: '', search: '' });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={styles.filterButton}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {articles.length > 0 ? (
            <section className={styles.articlesSection}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-newspaper"></i>
                Latest Articles
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
                {filters.topic || filters.search 
                  ? 'Try adjusting your filters to find more articles.'
                  : 'Check back soon for new articles and insights.'}
              </p>
            </div>
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
        
        {article.topics && (
          <div className={styles.articleTopics}>
            {article.topics.split(',').map((topic, index) => (
              <span key={index} className={styles.topicTag}>
                {topic.trim()}
              </span>
            ))}
          </div>
        )}
        
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