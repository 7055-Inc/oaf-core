import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from './styles/TopicsList.module.css';

export default function TopicsPage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api2.onlineartfestival.com/api/articles/topics');
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (err) {
      console.error('Error fetching topics:', err);
      setError('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const getTopicIcon = (topicName) => {
    const iconMap = {
      'Platform Updates': 'fas fa-bullhorn',
      'Tutorials': 'fas fa-graduation-cap',
      'Artist Spotlights': 'fas fa-star',
      'Art Techniques': 'fas fa-palette',
      'Community': 'fas fa-users',
      'Events': 'fas fa-calendar-alt',
      'News': 'fas fa-newspaper'
    };
    return iconMap[topicName] || 'fas fa-tag';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading topics...</div>
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
        <title>Article Topics - Online Art Festival</title>
        <meta name="description" content="Explore our article topics covering art techniques, tutorials, artist spotlights, platform updates, and community stories." />
        <meta name="keywords" content="art topics, article categories, art tutorials, artist spotlights, art techniques, art community" />
        <link rel="canonical" href="https://onlineartfestival.com/topics" />
        
        <meta property="og:title" content="Article Topics - Online Art Festival" />
        <meta property="og:description" content="Explore our article topics covering art techniques, tutorials, artist spotlights, and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://onlineartfestival.com/topics" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Article Topics - Online Art Festival" />
        <meta name="twitter:description" content="Explore our article topics covering art techniques, tutorials, artist spotlights, and more." />
      </Head>

      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.heroSection}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Article Topics</h1>
              <p className={styles.heroDescription}>
                Explore our organized collection of articles by topic. Find tutorials, 
                artist spotlights, techniques, and community stories all in one place.
              </p>
            </div>
          </div>

          {topics.length > 0 ? (
            <section className={styles.topicsSection}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-folder-open"></i>
                Browse Topics
              </h2>
              <div className={styles.topicsGrid}>
                {topics.map(topic => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            </section>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <i className="fas fa-folder-open"></i>
              </div>
              <h2 className={styles.emptyStateTitle}>No Topics Found</h2>
              <p className={styles.emptyStateDescription}>
                Check back soon for organized article topics.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TopicCard({ topic }) {
  const getTopicIcon = (topicName) => {
    const iconMap = {
      'Platform Updates': 'fas fa-bullhorn',
      'Tutorials': 'fas fa-graduation-cap',
      'Artist Spotlights': 'fas fa-star',
      'Art Techniques': 'fas fa-palette',
      'Community': 'fas fa-users',
      'Events': 'fas fa-calendar-alt',
      'News': 'fas fa-newspaper'
    };
    return iconMap[topicName] || 'fas fa-tag';
  };

  return (
    <Link href={`/topics/${topic.slug}`} className={styles.topicCard}>
      <div className={styles.topicIcon}>
        <i className={getTopicIcon(topic.name)}></i>
      </div>
      <div className={styles.topicContent}>
        <h3 className={styles.topicName}>{topic.name}</h3>
        <p className={styles.topicDescription}>{topic.description}</p>
        <div className={styles.topicStats}>
          <div className={styles.statItem}>
            <i className="fas fa-newspaper"></i>
            <span className={styles.articleCount}>{topic.article_count || 0}</span>
            <span>articles</span>
          </div>
          <div className={styles.statItem}>
            <i className="fas fa-arrow-right"></i>
            Explore
          </div>
        </div>
      </div>
    </Link>
  );
} 