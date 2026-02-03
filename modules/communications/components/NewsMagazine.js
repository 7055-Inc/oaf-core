import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './NewsMagazine.module.css';

/**
 * NewsMagazine - Shared magazine-style layout component
 * Used by artist-news, promoter-news, and community-news pillar pages
 * 
 * @param {Object} props
 * @param {string} props.section - The section identifier (artist-news, promoter-news, community-news)
 * @param {Object} props.config - Page-specific configuration (title, description, categories)
 * @param {Array} props.featuredArticles - Articles for hero slider (from SSR)
 * @param {Array} props.latestArticles - Articles for grid (from SSR)
 * @param {Object} props.pagination - Pagination info from SSR
 */
export default function NewsMagazine({ 
  section, 
  config, 
  featuredArticles = [], 
  latestArticles = [],
  pagination = { page: 1, total: 0, limit: 9 }
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance slider
  useEffect(() => {
    if (!isAutoPlaying || featuredArticles.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % featuredArticles.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, featuredArticles.length]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % featuredArticles.length);
  }, [currentSlide, featuredArticles.length, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + featuredArticles.length) % featuredArticles.length);
  }, [currentSlide, featuredArticles.length, goToSlide]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getReadingTime = (minutes) => {
    if (!minutes || minutes < 1) return '< 1 min';
    return `${Math.round(minutes)} min read`;
  };

  return (
    <div className={styles.magazine}>
      {/* Hero Slider */}
      {featuredArticles.length > 0 && (
        <section className={styles.heroSlider}>
          <div className={styles.sliderContainer}>
            {featuredArticles.map((article, index) => (
              <Link 
                href={`/articles/${article.slug}`} 
                key={article.id}
                className={`${styles.slide} ${index === currentSlide ? styles.active : ''}`}
              >
                <div className={styles.slideBackground}>
                  {article.featured_image_url ? (
                    <Image
                      src={article.featured_image_url}
                      alt={article.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      priority={index === 0}
                    />
                  ) : (
                    <div className={styles.placeholderBg}>
                      <i className="fas fa-newspaper"></i>
                    </div>
                  )}
                  <div className={styles.slideOverlay} />
                </div>
                <div className={styles.slideContent}>
                  <span className={styles.slideCategory}>
                    {article.topics || config.defaultCategory || 'Featured'}
                  </span>
                  <h2 className={styles.slideTitle}>{article.title}</h2>
                  <p className={styles.slideExcerpt}>{article.excerpt}</p>
                  <div className={styles.slideMeta}>
                    <span>{article.author_display_name || article.author_username}</span>
                    <span>•</span>
                    <span>{formatDate(article.published_at)}</span>
                    <span>•</span>
                    <span>{getReadingTime(article.reading_time_minutes)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Slider Controls */}
          {featuredArticles.length > 1 && (
            <>
              <button 
                className={`${styles.sliderArrow} ${styles.prevArrow}`}
                onClick={(e) => { e.preventDefault(); prevSlide(); }}
                aria-label="Previous slide"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button 
                className={`${styles.sliderArrow} ${styles.nextArrow}`}
                onClick={(e) => { e.preventDefault(); nextSlide(); }}
                aria-label="Next slide"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
              <div className={styles.sliderDots}>
                {featuredArticles.map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.dot} ${index === currentSlide ? styles.activeDot : ''}`}
                    onClick={(e) => { e.preventDefault(); goToSlide(index); }}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Category Boxes */}
      <section className={styles.categoriesSection}>
        <div className={styles.categoriesGrid}>
          {config.categories.map((category, index) => (
            <div key={index} className={styles.categoryBox}>
              <div className={styles.categoryIcon}>
                <i className={category.icon}></i>
              </div>
              <h3 className={styles.categoryTitle}>{category.name}</h3>
              <p className={styles.categoryDescription}>{category.description}</p>
              {/* Categories are placeholders - will link to filtered views later */}
            </div>
          ))}
        </div>
      </section>

      {/* Latest Articles Grid */}
      <section className={styles.articlesSection}>
        <h2 className={styles.sectionTitle}>
          <i className="fas fa-clock"></i>
          Latest Articles
        </h2>

        {latestArticles.length > 0 ? (
          <div className={styles.articlesGrid}>
            {latestArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-newspaper"></i>
            <span>No articles yet. Check back soon!</span>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className={styles.pagination}>
            <Link 
              href={`/news/${section}?page=${pagination.page - 1}`}
              className={`${styles.pageButton} ${pagination.page <= 1 ? styles.disabled : ''}`}
            >
              <i className="fas fa-chevron-left"></i> Previous
            </Link>
            <span className={styles.pageInfo}>
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <Link 
              href={`/news/${section}?page=${pagination.page + 1}`}
              className={`${styles.pageButton} ${pagination.page >= Math.ceil(pagination.total / pagination.limit) ? styles.disabled : ''}`}
            >
              Next <i className="fas fa-chevron-right"></i>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Article Card Component
 */
function ArticleCard({ article }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getReadingTime = (minutes) => {
    if (!minutes || minutes < 1) return '< 1 min';
    return `${Math.round(minutes)} min`;
  };

  return (
    <Link href={`/articles/${article.slug}`} className={styles.articleCard}>
      <div className={styles.articleImage}>
        {article.featured_image_url ? (
          <Image
            src={article.featured_image_url}
            alt={article.title}
            fill
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.articlePlaceholder}>
            <i className="fas fa-image"></i>
          </div>
        )}
      </div>
      <div className={styles.articleContent}>
        {article.topics && (
          <span className={styles.articleTopic}>
            {article.topics.split(',')[0].trim()}
          </span>
        )}
        <h3 className={styles.articleTitle}>{article.title}</h3>
        <p className={styles.articleExcerpt}>{article.excerpt}</p>
        <div className={styles.articleMeta}>
          <span className={styles.articleAuthor}>
            {article.author_display_name || article.author_username}
          </span>
          <span className={styles.articleDate}>
            {formatDate(article.published_at)}
          </span>
          <span className={styles.articleReadTime}>
            <i className="fas fa-clock"></i> {getReadingTime(article.reading_time_minutes)}
          </span>
        </div>
      </div>
    </Link>
  );
}

