import Link from 'next/link';
import styles from './MagazineLink.module.css';

/**
 * MagazineLink - Dashboard component that links to the appropriate news pillar page
 * Routes users based on their user_type to their relevant magazine section
 * 
 * @param {Object} props
 * @param {Object} props.userData - User data object containing user_type
 */
export default function MagazineLink({ userData }) {
  // Determine which news page to link to based on user type
  const getNewsConfig = (userType) => {
    switch (userType) {
      case 'artist':
        return {
          href: '/news/artist-news',
          title: 'Artist News',
          subtitle: 'Tips & inspiration for your art business',
          icon: 'fas fa-palette',
          gradient: 'linear-gradient(135deg, #055474 0%, #0c7489 100%)'
        };
      case 'promoter':
        return {
          href: '/news/promoter-news',
          title: 'Promoter News',
          subtitle: 'Resources for event organizers',
          icon: 'fas fa-bullhorn',
          gradient: 'linear-gradient(135deg, #3E1C56 0%, #5a2d7a 100%)'
        };
      case 'community':
      default:
        return {
          href: '/news/community-news',
          title: 'Community News',
          subtitle: 'Discover art, events & trends',
          icon: 'fas fa-users',
          gradient: 'linear-gradient(135deg, #055474 0%, #3E1C56 100%)'
        };
    }
  };

  const config = getNewsConfig(userData?.user_type);

  return (
    <Link href={config.href} className={styles.magazineLink}>
      <div className={styles.linkContent} style={{ background: config.gradient }}>
        <div className={styles.iconWrapper}>
          <i className={config.icon}></i>
        </div>
        <div className={styles.textWrapper}>
          <span className={styles.title}>{config.title}</span>
          <span className={styles.subtitle}>{config.subtitle}</span>
        </div>
        <div className={styles.arrow}>
          <i className="fas fa-arrow-right"></i>
        </div>
      </div>
    </Link>
  );
}

