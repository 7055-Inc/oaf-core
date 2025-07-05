import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../../components/Header';
import styles from '../styles/ArticleArchive.module.css';

export default function AuthorArchivePage() {
  const router = useRouter();
  const { username } = router.query;
  const [author, setAuthor] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    Promise.all([
      fetch(`https://api2.onlineartfestival.com/users/profile/${username}`).then(res => res.json()),
      fetch(`https://api2.onlineartfestival.com/api/articles?author=${username}&limit=${pagination.limit}&page=${pagination.page}`).then(res => res.json())
    ])
      .then(([profileData, articlesData]) => {
        setAuthor(profileData.user || null);
        setAuthorProfile(profileData.profile || null);
        setArticles(articlesData.articles || []);
        setPagination(prev => ({
          ...prev,
          total: articlesData.pagination?.total || 0,
          pages: articlesData.pagination?.pages || 0
        }));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading author data:', err);
        setError('Failed to load author or articles');
        setLoading(false);
      });
  }, [username, pagination.page]);

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

  const getAuthorInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('/static_media/')) {
      return imagePath;
    }
    return `https://onlineartfestival.com${imagePath}`;
  };

  if (loading) return (
    <div className={styles.container}>
      <Header />
      <div className={styles.loading}>Loading author...</div>
    </div>
  );

  if (error) return (
    <div className={styles.container}>
      <Header />
      <div className={styles.error}>{error}</div>
    </div>
  );

  if (!author) return (
    <div className={styles.container}>
      <Header />
      <div className={styles.error}>Author not found</div>
    </div>
  );

  // SEO meta tags
  const authorDisplayName = authorProfile?.display_name || author.username;
  const metaTitle = `Articles by ${authorDisplayName} - Online Art Festival`;
  const metaDescription = authorProfile?.artist_biography 
    ? `Read articles by ${authorDisplayName}. ${authorProfile.artist_biography.substring(0, 120)}...`
    : `Explore articles written by ${authorDisplayName} on Online Art Festival`;
  const canonicalUrl = `https://onlineartfestival.com/articles/author/${username}`;

  // Generate JSON-LD structured data
  const generateAuthorSchema = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": authorDisplayName,
      "url": canonicalUrl,
      "sameAs": []
    };

    if (authorProfile?.artist_biography) {
      schema.description = authorProfile.artist_biography;
    }

    if (authorProfile?.business_website) {
      schema.sameAs.push(authorProfile.business_website);
    }

    if (authorProfile?.business_social_instagram) {
      schema.sameAs.push(`https://instagram.com/${authorProfile.business_social_instagram}`);
    }

    if (authorProfile?.business_social_facebook) {
      schema.sameAs.push(authorProfile.business_social_facebook);
    }

    if (authorProfile?.business_social_twitter) {
      schema.sameAs.push(`https://twitter.com/${authorProfile.business_social_twitter}`);
    }

    // Add articles as works
    if (articles.length > 0) {
      schema.mainEntityOfPage = {
        "@type": "ItemList",
        "itemListElement": articles.map((article, index) => ({
          "@type": "Article",
          "position": index + 1,
          "name": article.title,
          "url": `https://onlineartfestival.com/articles/${article.slug}`,
          "author": {
            "@type": "Person",
            "name": authorDisplayName
          },
          "datePublished": article.published_at
        }))
      };
    }

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
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: generateAuthorSchema() }}
        />
      </Head>

      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          {/* Author Hero Section */}
          <div className={styles.heroSection}>
            <div className={styles.authorInfo}>
              <div className={styles.authorAvatar}>
                {authorProfile?.logo_path ? (
                  <img 
                    src={getImageUrl(authorProfile.logo_path)} 
                    alt={authorDisplayName}
                    className={styles.avatarImage}
                  />
                ) : (
                  <span className={styles.avatarInitials}>
                    {getAuthorInitials(authorDisplayName)}
                  </span>
                )}
              </div>
              
              <div className={styles.authorDetails}>
                <h1 className={styles.authorName}>{authorDisplayName}</h1>
                {authorProfile?.business_name && authorProfile.business_name !== authorDisplayName && (
                  <p className={styles.businessName}>{authorProfile.business_name}</p>
                )}
                {authorProfile?.artist_biography && (
                  <p className={styles.authorBio}>{authorProfile.artist_biography}</p>
                )}
                
                <div className={styles.authorStats}>
                  <span className={styles.articleCount}>{pagination.total} articles</span>
                  {authorProfile?.business_website && (
                    <>
                      <span className={styles.separator}>•</span>
                      <a 
                        href={authorProfile.business_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.websiteLink}
                      >
                        Website
                      </a>
                    </>
                  )}
                </div>

                {/* Social Links */}
                {(authorProfile?.business_social_instagram || 
                  authorProfile?.business_social_facebook || 
                  authorProfile?.business_social_twitter) && (
                  <div className={styles.socialLinks}>
                    {authorProfile.business_social_instagram && (
                      <a 
                        href={`https://instagram.com/${authorProfile.business_social_instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        Instagram
                      </a>
                    )}
                    {authorProfile.business_social_facebook && (
                      <a 
                        href={authorProfile.business_social_facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        Facebook
                      </a>
                    )}
                    {authorProfile.business_social_twitter && (
                      <a 
                        href={`https://twitter.com/${authorProfile.business_social_twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        Twitter
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link href="/articles">Articles</Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>By {authorDisplayName}</span>
          </nav>

          {/* Articles Grid */}
          <div className={styles.articlesSection}>
            <h2 className={styles.sectionTitle}>Articles by {authorDisplayName}</h2>
            
            {articles.length === 0 ? (
              <div className={styles.noArticles}>
                <p>No published articles found for this author.</p>
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