'use client';
import styles from './DashboardFooter.module.css';

export default function DashboardFooter() {
  return (
    <footer className={styles.dashboardFooter}>
      <div className={styles.footerContainer}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Brakebee & Online Art Festival LLC
        </p>
      </div>
    </footer>
  );
}

