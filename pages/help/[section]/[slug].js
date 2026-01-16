/**
 * Help Article Page
 * Individual help article with technical, plain styling
 */
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Breadcrumb from '../../../components/Breadcrumb';
import { apiRequest } from '../../../lib/apiUtils';
import { getApiUrl } from '../../../lib/config';
import styles from '../Help.module.css';

// Section metadata for breadcrumbs
const SECTION_META = {
  'getting-started': { title: 'Getting Started' },
  'account-profile': { title: 'Account & Profile' },
  'orders-shipping': { title: 'Orders & Shipping' },
  'returns-refunds': { title: 'Returns & Refunds' },
  'events': { title: 'Events' },
  'marketplace': { title: 'Marketplace' },
  'payments-billing': { title: 'Payments & Billing' },
  'technical': { title: 'Technical Support' }
};

export default function HelpArticlePage() {
  const router = useRouter();
  const { section, slug } = router.query;
  
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'helpful' | 'not-helpful' | null
  const [selectedImage, setSelectedImage] = useState(0);

  const sectionMeta = SECTION_META[section] || { 
    title: section?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Help'
  };

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`api/articles/${slug}`);
      if (!response.ok) {
        throw new Error('Article not found');
      }
      const data = await response.json();
      setArticle(data.article);
      
      // Fetch related articles from same section
      if (data.article?.section) {
        fetchRelatedArticles(data.article.section, data.article.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedArticles = async (articleSection, currentId) => {
    try {
      const response = await apiRequest(`api/articles?page_type=help_article&section=${articleSection}&status=published&limit=5`);
      const data = await response.json();
      // Filter out current article
      setRelatedArticles((data.articles || []).filter(a => a.id !== currentId).slice(0, 4));
    } catch (err) {
      // Silent fail for related articles
    }
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    // Could send feedback to API here
  };

  // Generate table of contents from h2 headers in content
  const generateTOC = (content) => {
    if (!content) return [];
    const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, ''); // Strip any inner HTML
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      matches.push({ text, id });
    }
    return matches;
  };

  // Add IDs to h2 elements in content for anchor links
  const processContent = (content) => {
    if (!content) return '';
    return content.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs, text) => {
      const plainText = text.replace(/<[^>]*>/g, '');
      const id = plainText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `<h2${attrs} id="${id}">${text}</h2>`;
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i> Loading article...
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Help Center', href: '/help' },
            { label: 'Article Not Found' }
          ]} />
          <div className={styles.errorPage}>
            <i className="fas fa-exclamation-circle"></i>
            <h1>Article Not Found</h1>
            <p>The help article you're looking for doesn't exist or has been moved.</p>
            <Link href="/help" className="primary">
              Back to Help Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const toc = generateTOC(article.content);
  const processedContent = processContent(article.content);

  return (
    <>
      <Head>
        <title>{article.title} - Help Center - Brakebee</title>
        <meta name="description" content={article.excerpt || article.meta_description || `Help article: ${article.title}`} />
        <link rel="canonical" href={`https://brakebee.com/help/${section}/${slug}`} />
      </Head>

      <div className={styles.container}>
        <div className={styles.articleLayout}>
          {/* Sidebar */}
          <aside className={styles.articleSidebar}>
            <div className={styles.sidebarSection}>
              <h4>In This Article</h4>
              {toc.length > 0 ? (
                <nav className={styles.tocNav}>
                  {toc.map((item, idx) => (
                    <a key={idx} href={`#${item.id}`} className={styles.tocLink}>
                      {item.text}
                    </a>
                  ))}
                </nav>
              ) : (
                <p className={styles.noToc}>Quick read - no sections</p>
              )}
            </div>

            {relatedArticles.length > 0 && (
              <div className={styles.sidebarSection}>
                <h4>Related Articles</h4>
                <nav className={styles.relatedNav}>
                  {relatedArticles.map(related => (
                    <Link 
                      key={related.id} 
                      href={`/help/${section}/${related.slug}`}
                      className={styles.relatedLink}
                    >
                      {related.title}
                    </Link>
                  ))}
                </nav>
              </div>
            )}

            <div className={styles.sidebarSection}>
              <Link href={`/help/${section}`} className={styles.sectionLink}>
                <i className="fas fa-folder-open"></i>
                Browse all {sectionMeta.title} articles
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <main className={styles.articleMain}>
            <Breadcrumb items={[
              { label: 'Home', href: '/' },
              { label: 'Help Center', href: '/help' },
              { label: sectionMeta.title, href: `/help/${section}` },
              { label: article.title }
            ]} />

            <article className={styles.helpArticle}>
              <header className={styles.articleHeader}>
                <h1>{article.title}</h1>
                {article.updated_at && (
                  <p className={styles.lastUpdated}>
                    Last updated: {new Date(article.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </header>

              {/* Image Gallery */}
              {article.images && article.images.length > 0 && (
                <div className={styles.imageGallery}>
                  <div className={styles.mainImage}>
                    {(() => {
                      const currentImage = article.images[selectedImage];
                      const imageUrl = typeof currentImage === 'string' 
                        ? currentImage 
                        : currentImage?.url;
                      const fullUrl = imageUrl?.startsWith('/') 
                        ? getApiUrl(imageUrl.slice(1)) 
                        : imageUrl;
                      return (
                        <img 
                          src={fullUrl} 
                          alt={currentImage?.alt_text || `${article.title} - Image ${selectedImage + 1}`} 
                        />
                      );
                    })()}
                  </div>
                  
                  {article.images.length > 1 && (
                    <div className={styles.thumbnailStrip}>
                      {article.images.map((image, index) => {
                        const imageUrl = typeof image === 'string' ? image : image?.url;
                        const fullUrl = imageUrl?.startsWith('/') 
                          ? getApiUrl(imageUrl.slice(1)) 
                          : imageUrl;
                        return (
                          <button
                            key={index}
                            className={`${styles.thumbnail} ${index === selectedImage ? styles.selected : ''}`}
                            onClick={() => setSelectedImage(index)}
                          >
                            <img 
                              src={fullUrl} 
                              alt={image?.alt_text || `Thumbnail ${index + 1}`} 
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div 
                className={styles.articleContent}
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />

              {/* Feedback Section */}
              <div className={styles.feedbackSection}>
                <h4>Was this article helpful?</h4>
                {feedback ? (
                  <p className={styles.feedbackThanks}>
                    Thanks for your feedback!
                  </p>
                ) : (
                  <div className={styles.feedbackButtons}>
                    <button 
                      onClick={() => handleFeedback('helpful')}
                      className={styles.feedbackBtn}
                    >
                      <i className="fas fa-thumbs-up"></i> Yes
                    </button>
                    <button 
                      onClick={() => handleFeedback('not-helpful')}
                      className={styles.feedbackBtn}
                    >
                      <i className="fas fa-thumbs-down"></i> No
                    </button>
                  </div>
                )}
              </div>

              {/* Need More Help */}
              <div className={styles.needMoreHelp}>
                <h4>Still need help?</h4>
                <p>Can't find what you're looking for? Our support team is here to help.</p>
                <Link href="/help/contact" className="primary">
                  Contact Support
                </Link>
              </div>
            </article>
          </main>
        </div>
      </div>
    </>
  );
}

