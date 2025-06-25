'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import HeroManagement from '../../components/HeroManagement';
import CategoryManagement from '../../components/CategoryManagement';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.split('token=')[1]?.split(';')[0];
    if (!token) {
      router.push('/');
    } else {
      setIsLoggedIn(true);
      // Fetch user data to check roles
      fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user data');
          }
          return res.json();
        })
        .then(data => {
          console.log('Dashboard - Current User Data:', data);
          setUserData(data);
        })
        .catch(err => {
          console.error('Error fetching user data:', err.message);
          setError(err.message);
        });
    }
  }, [router]);

  if (!isLoggedIn) {
    return null;
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1>Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  const isAdmin = userData.user_type === 'admin';
  const isVendor = userData.user_type === 'vendor';
  const canManageProducts = isAdmin || isVendor;

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className={styles.contentSection}>
            <h2>Dashboard Overview</h2>
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <h3>Quick Actions</h3>
                <div className={styles.quickActions}>
                  {canManageProducts && (
                    <Link href="/dashboard/products" className={styles.primaryButton}>
                      View Products
                    </Link>
                  )}
                  {canManageProducts && (
                    <Link href="/products/new" className={styles.primaryButton}>
                      Add New Product
                    </Link>
                  )}
                  <Link href="/api-keys" className={styles.primaryButton}>
                    Generate API Keys
                  </Link>
                </div>
              </div>
              <div className={styles.overviewCard}>
                <h3>Recent Activity</h3>
                <p>No recent activity to display.</p>
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className={styles.contentSection}>
            <h2>Profile Management</h2>
            <p>Manage your account settings and profile information.</p>
          </div>
        );
      case 'orders':
        return (
          <div className={styles.contentSection}>
            <h2>My Orders</h2>
            <p>View your order history and track current orders.</p>
          </div>
        );
      case 'user-management':
        return (
          <div className={styles.contentSection}>
            <h2>User Management</h2>
            <p>User management functionality will be integrated here.</p>
          </div>
        );
      case 'hero-settings':
        return (
          <div className={styles.contentSection}>
            <h2>Hero Settings</h2>
            <HeroManagement />
          </div>
        );
      case 'category-management':
        return (
          <div className={styles.contentSection}>
            <CategoryManagement />
          </div>
        );
      case 'api-keys':
        return (
          <div className={styles.contentSection}>
            <h2>API Keys</h2>
            <p>Manage your API keys and access tokens.</p>
          </div>
        );
      case 'api-docs':
        return (
          <div className={styles.contentSection}>
            <h2>API Documentation</h2>
            <p>Documentation and guides for using the API.</p>
          </div>
        );
      default:
        return (
          <div className={styles.contentSection}>
            <h2>Dashboard</h2>
            <p>Welcome to your dashboard.</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Collapsible Header */}
      {headerCollapsed ? (
        <div className={styles.collapsedHeader}>
          <button 
            onClick={() => setHeaderCollapsed(false)}
            className={styles.expandButton}
          >
            ☰ Click here to open menu
          </button>
        </div>
      ) : (
        <Header />
      )}

      <div className={styles.mainContent}>
        {/* Left Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3>Dashboard</h3>
            <ul>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'overview' ? styles.active : ''}`}
                  onClick={() => setActiveSection('overview')}
                >
                  Overview
                </button>
              </li>
            </ul>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Manage My Account</h3>
            <ul>
              <li>
                <Link href="/profile/edit" className={styles.sidebarLink}>
                  Edit Profile
                </Link>
              </li>
              <li>
                <Link href={`/profile/${userData.id}`} className={styles.sidebarLink}>
                  View Profile
                </Link>
              </li>
            </ul>
          </div>

          <div className={styles.sidebarSection}>
            <h3>History</h3>
            <ul>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'orders' ? styles.active : ''}`}
                  onClick={() => setActiveSection('orders')}
                >
                  My Orders
                </button>
              </li>
            </ul>
          </div>

          {isAdmin && (
            <div className={styles.sidebarSection}>
              <h3>Admin Tools</h3>
              <ul>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'user-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('user-management')}
                  >
                    User Management
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'hero-settings' ? styles.active : ''}`}
                    onClick={() => setActiveSection('hero-settings')}
                  >
                    Hero Settings
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'category-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('category-management')}
                  >
                    Category Management
                  </button>
                </li>
              </ul>
            </div>
          )}

          <div className={styles.sidebarSection}>
            <h3>Developers</h3>
            <ul>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'api-keys' ? styles.active : ''}`}
                  onClick={() => setActiveSection('api-keys')}
                >
                  My API Keys
                </button>
              </li>
              <li>
                <Link href="/api-keys" className={styles.sidebarLink}>
                  Generate API Key
                </Link>
              </li>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'api-docs' ? styles.active : ''}`}
                  onClick={() => setActiveSection('api-docs')}
                >
                  API Docs
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Content Area */}
        <div className={styles.contentArea}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 