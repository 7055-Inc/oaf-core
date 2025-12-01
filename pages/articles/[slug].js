import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getApiUrl, getFrontendUrl } from '../../lib/config';
import SocialShare from '../../components/SocialShare';
import styles from './styles/ArticleView.module.css';

export default function ArticlePage() {
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [crossReferences, setCrossReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`api/articles/${slug}`));
      const data = await response.json();
      
      if (data.article) {
        setArticle(data.article);
        await updateViewCount(data.article.id);
        fetchRelatedArticles(data.article.topics);
        
        // Fetch cross-references if they exist
        if (data.article.connections && data.article.connections.length > 0) {
          fetchCrossReferences(data.article.connections);
        }
      } else {
        setError('Article not found');
      }
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const updateViewCount = async (articleId) => {
    try {
      await fetch(`api/articles/${articleId}/view`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Error updating view count:', err);
    }
  };

  const fetchRelatedArticles = async (topics) => {
    if (!topics || topics.length === 0) return;
    
    try {
      const topicSlugs = topics.map(topic => topic.slug).join(',');
      const response = await fetch(`api/articles?topic=${topicSlugs}&limit=3&status=published`);
      const data = await response.json();
      
      if (data.articles) {
        const filtered = data.articles.filter(a => a.slug !== slug);
        setRelatedArticles(filtered.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching related articles:', err);
    }
  };

  const fetchCrossReferences = async (connections) => {
    try {
      const references = [];
      
      for (const connection of connections) {
        let details = null;
        
        switch (connection.connection_type) {
          case 'user':
          case 'artist':
            try {
              const userResponse = await fetch(`api/users/${connection.connection_id}`);
              if (userResponse.ok) {
                const userData = await userResponse.json();
                details = {
                  type: 'Artist',
                  name: userData.display_name || userData.username || 'Unknown Artist',
                  url: `/artists/${userData.username || userData.id}`,
                  description: userData.artist_biography || 'Featured artist',
                  icon: 'fas fa-user-circle'
                };
              }
            } catch (err) {
              console.error('Error fetching user details:', err);
            }
            break;
            
          case 'event':
            try {
              const eventResponse = await fetch(`api/events/${connection.connection_id}`);
              if (eventResponse.ok) {
                const eventData = await eventResponse.json();
                details = {
                  type: 'Event',
                  name: eventData.title || 'Unknown Event',
                  url: `/events/${eventData.id}`,
                  description: eventData.short_description || eventData.description || 'Related event',
                  icon: 'fas fa-calendar-alt',
                  meta: eventData.start_date ? `${new Date(eventData.start_date).toLocaleDateString()}` : null
                };
              }
            } catch (err) {
              console.error('Error fetching event details:', err);
            }
            break;
            
          case 'product':
            try {
              const productResponse = await fetch(`api/products/${connection.connection_id}`);
              if (productResponse.ok) {
                const productData = await productResponse.json();
                details = {
                  type: 'Product',
                  name: productData.name || 'Unknown Product',
                  url: `/products/${productData.id}`,
                  description: productData.description || 'Featured product',
                  icon: 'fas fa-box',
                  meta: productData.price ? `$${productData.price}` : null
                };
              }
            } catch (err) {
              console.error('Error fetching product details:', err);
            }
            break;
            
          default:
            // Handle unknown connection types
            details = {
              type: connection.connection_type,
              name: `Connected ${connection.connection_type}`,
              url: '#',
              description: 'Related content',
              icon: 'fas fa-link'
            };
        }
        
        if (details) {
          references.push(details);
        }
      }
      
      setCrossReferences(references);
    } catch (err) {
      console.error('Error fetching cross references:', err);
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

  const getAuthorInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getReadingTime = (minutes) => {
    if (!minutes || minutes < 1) return '< 1 min read';
    return `${Math.round(minutes)} min read`;
  };

  // Generate JSON-LD structured data
  const generateArticleSchema = () => {
    const canonicalUrl = getFrontendUrl(`/articles/${article.slug}`);
    
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.excerpt || article.meta_description,
      "author": {
        "@type": "Person",
        "name": article.author_display_name || article.author_username,
        "url": getFrontendUrl(`/artists/${article.author_username}`)
      },
      "publisher": {
        "@type": "Organization",
        "name": "Online Art Festival",
        "url": getFrontendUrl('/'),
        "logo": {
          "@type": "ImageObject",
          "url": getFrontendUrl('/logo.png')
        }
      },
      "datePublished": article.published_at,
      "dateModified": article.updated_at || article.published_at,
      "url": canonicalUrl,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      },
      "isPartOf": {
        "@type": "WebSite",
        "name": "Online Art Festival",
        "url": ""
      },
      "inLanguage": "en-US",
      "copyrightHolder": {
        "@type": "Organization",
        "name": "Online Art Festival LLC"
      },
      "copyrightYear": new Date(article.published_at).getFullYear(),
      "genre": article.page_type === 'help_article' ? 'Help Documentation' : 'Article',
      "audience": {
        "@type": "Audience",
        "audienceType": "Art Community"
      }
    };

    // Add reading time
    if (article.reading_time_minutes) {
      schema.timeRequired = `PT${Math.round(article.reading_time_minutes)}M`;
    }

    // Add word count (estimate from reading time)
    if (article.reading_time_minutes) {
      schema.wordCount = Math.round(article.reading_time_minutes * 200); // 200 words per minute
    }

    // Add article sections (topics)
    if (article.topics && article.topics.length > 0) {
      schema.articleSection = article.topics.map(topic => topic.name);
      schema.keywords = article.topics.map(topic => topic.name).join(', ');
      
      // Add "about" entities for topics (enhanced for topic-based discovery)
      schema.about = article.topics.map(topic => ({
        "@type": "Thing",
        "name": topic.name,
        "url": `/topics/${topic.slug}`
      }));
    }

    // Add featured image if available
    if (article.featured_image || article.og_image) {
      schema.image = {
        "@type": "ImageObject",
        "url": article.featured_image || article.og_image,
        "width": 1200,
        "height": 630
      };
    }

    // Add interaction statistics for engagement signals
    if (article.view_count && article.view_count > 0) {
      schema.interactionStatistic = {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/ViewAction",
        "userInteractionCount": article.view_count
      };
    }

    // Add custom schema if provided (from article_schema table)
    if (article.custom_schema) {
      try {
        const customSchema = JSON.parse(article.custom_schema);
        Object.assign(schema, customSchema);
      } catch (e) {
        console.warn('Invalid article schema JSON:', e);
      }
    }

    return JSON.stringify(schema);
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article.title;
    const text = article.excerpt;
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading article...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Article not found</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{article.meta_title || article.title}</title>
        <meta name="description" content={article.meta_description || article.excerpt} />
        <meta name="keywords" content={article.meta_keywords || ''} />
        <link rel="canonical" href={`/articles/${article.slug}`} />
        
        <meta property="og:title" content={article.og_title || article.title} />
        <meta property="og:description" content={article.og_description || article.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`/articles/${article.slug}`} />
        <meta property="og:image" content={article.og_image || article.featured_image || '/default-article.jpg'} />
        <meta property="article:published_time" content={article.published_at} />
        <meta property="article:author" content={article.author_display_name || article.author_username} />
        
        <meta name="twitter:card" content={article.twitter_card_type || 'summary_large_image'} />
        <meta name="twitter:title" content={article.twitter_title || article.og_title || article.title} />
        <meta name="twitter:description" content={article.twitter_description || article.og_description || article.excerpt} />
        <meta name="twitter:image" content={article.twitter_image || article.og_image || article.featured_image || '/default-article.jpg'} />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: generateArticleSchema() }}
        />
      </Head>

      <div className={styles.container}>
        
        <div className={styles.content}>
          <div className={styles.navigation}>
            <Link href="/articles" className={styles.navButton}>
              <i className="fas fa-arrow-left"></i>
              Back to Articles
            </Link>
          </div>

          <article className={styles.articleHeader}>
            <h1 className={styles.articleTitle}>{article.title}</h1>
            
            {article.excerpt && (
              <p className={styles.articleExcerpt}>{article.excerpt}</p>
            )}
            
            <div className={styles.articleMeta}>
              <div className={styles.authorInfo}>
                <div className={styles.authorAvatar}>
                  {getAuthorInitials(article.author_display_name || article.author_username)}
                </div>
                <div className={styles.authorDetails}>
                  <div className={styles.authorName}>
                    {article.author_display_name || article.author_username}
                  </div>
                  <div className={styles.publishDate}>
                    {formatDate(article.published_at)}
                  </div>
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
            
            {article.topics && article.topics.length > 0 && (
              <div className={styles.articleTopics}>
                {article.topics.map(topic => (
                  <Link 
                    key={topic.id} 
                    href={`/topics/${topic.slug}`} 
                    className={styles.topicTag}
                  >
                    {topic.name}
                  </Link>
                ))}
              </div>
            )}
          </article>

          <div className={styles.articleContent} dangerouslySetInnerHTML={{ __html: article.content }} />

          {/* Social Share Section */}
          <SocialShare 
            url={`/articles/${article.slug}`}
            title={article.title}
            description={article.excerpt || article.meta_description}
            image={article.og_image || article.featured_image}
          />

          {/* Cross-References Section */}
          {crossReferences.length > 0 && (
            <div className={styles.crossReferencesSection}>
              <h3 className={styles.crossReferencesTitle}>
                <i className="fas fa-link"></i>
                Related Content
              </h3>
              <div className={styles.crossReferencesGrid}>
                {crossReferences.map((reference, index) => (
                  <Link 
                    key={index} 
                    href={reference.url} 
                    className={styles.crossReferenceCard}
                  >
                    <div className={styles.crossReferenceIcon}>
                      <i className={reference.icon}></i>
                    </div>
                    <div className={styles.crossReferenceContent}>
                      <div className={styles.crossReferenceType}>
                        {reference.type}
                      </div>
                      <h4 className={styles.crossReferenceName}>
                        {reference.name}
                      </h4>
                      <p className={styles.crossReferenceDescription}>
                        {reference.description}
                      </p>
                      {reference.meta && (
                        <div className={styles.crossReferenceMeta}>
                          {reference.meta}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Series Navigation */}
          {article.series && (
            <div className={styles.seriesNavigation}>
              <div className={styles.seriesHeader}>
                <h3 className={styles.seriesTitle}>
                  Part of Series: <Link href={`/series/${article.series.slug}`}>{article.series.series_name}</Link>
                </h3>
                <span className={styles.seriesPosition}>
                  Article {article.series.position_in_series} of {article.series.total_articles || 'series'}
                </span>
              </div>
              
              <div className={styles.seriesNav}>
                {article.series.prev_article && (
                  <Link href={`/articles/${article.series.prev_article.slug}`} className={styles.seriesNavButton}>
                    <i className="fas fa-arrow-left"></i>
                    <div>
                      <span className={styles.seriesNavLabel}>Previous</span>
                      <span className={styles.seriesNavTitle}>{article.series.prev_article.title}</span>
                    </div>
                  </Link>
                )}
                
                {article.series.next_article && (
                  <Link href={`/articles/${article.series.next_article.slug}`} className={styles.seriesNavButton}>
                    <div>
                      <span className={styles.seriesNavLabel}>Next</span>
                      <span className={styles.seriesNavTitle}>{article.series.next_article.title}</span>
                    </div>
                    <i className="fas fa-arrow-right"></i>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Share Section */}
          <div className={styles.shareSection}>
            <h3 className={styles.shareTitle}>Share this article</h3>
            <div className={styles.shareButtons}>
              <button 
                onClick={() => handleShare('twitter')} 
                className={styles.shareButton}
                title="Share on Twitter"
              >
                <i className="fab fa-twitter"></i>
                Twitter
              </button>
              <button 
                onClick={() => handleShare('facebook')} 
                className={styles.shareButton}
                title="Share on Facebook"
              >
                <i className="fab fa-facebook"></i>
                Facebook
              </button>
              <button 
                onClick={() => handleShare('linkedin')} 
                className={styles.shareButton}
                title="Share on LinkedIn"
              >
                <i className="fab fa-linkedin"></i>
                LinkedIn
              </button>
              <button 
                onClick={() => handleShare('copy')} 
                className={styles.shareButton}
                title="Copy link"
              >
                <i className="fas fa-copy"></i>
                Copy Link
              </button>
            </div>
          </div>

          {relatedArticles.length > 0 && (
            <div className={styles.relatedSection}>
              <h3 className={styles.relatedTitle}>Related Articles</h3>
              <div className={styles.relatedGrid}>
                {relatedArticles.map(relatedArticle => (
                  <Link 
                    key={relatedArticle.id} 
                    href={`/articles/${relatedArticle.slug}`} 
                    className={styles.relatedArticle}
                  >
                    <h4 className={styles.relatedArticleTitle}>{relatedArticle.title}</h4>
                    <p className={styles.relatedArticleExcerpt}>{relatedArticle.excerpt}</p>
                    <div className={styles.relatedArticleMeta}>
                      {formatDate(relatedArticle.published_at)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 