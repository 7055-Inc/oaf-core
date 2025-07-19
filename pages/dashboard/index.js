'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import HeroManagement from '../../components/HeroManagement';
import CategoryManagement from '../../components/CategoryManagement';
import CategoryChangeLog from '../../components/CategoryChangeLog';
import UserManagement from '../../components/UserManagement';
import EventManagement from '../../components/EventManagement';
import PermissionsManagement from '../../components/PermissionsManagement';
import EmailAdminDashboard from '../../components/EmailAdminDashboard';
import EmailPreferences from '../../components/EmailPreferences';
import ArticleManagement from '../articles/components/ArticleManagement';
import SitesManagement from '../../components/SitesManagement';
import AnnouncementsManagement from '../../components/AnnouncementsManagement';
import TermsManagement from '../../components/TermsManagement';
import CommissionManagement from '../../components/CommissionManagement';
import { getAuthToken } from '../../lib/csrf';
import styles from './Dashboard.module.css';
import VendorOrders from '../../components/VendorOrders';

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/');
    } else {
      setIsLoggedIn(true);
      // Fetch user data and extract permissions from JWT
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
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
            // Add permissions from JWT to user data
            const userData = {
              ...data,
              permissions: payload.permissions || []
            };
            setUserData(userData);
          })
          .catch(err => {
            console.error('Error fetching user data:', err.message);
            setError(err.message);
          });
      } catch (jwtError) {
        console.error('Error parsing JWT:', jwtError);
        setError('Invalid authentication token');
      }
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
  const isPromoter = userData.user_type === 'promoter';
  const hasVendorPermission = userData.permissions?.includes('vendor');
  const canManageProducts = isAdmin || hasVendorPermission;
  const canManageEvents = isAdmin || isPromoter;
  const canManageArticles = isAdmin || userData.permissions?.includes('manage_content');
  const canManageSites = isAdmin || userData.permissions?.includes('manage_sites');
  const canManageSystem = isAdmin || userData.permissions?.includes('manage_system');

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
      case 'finance-dashboard':
        return (
          <div className={styles.contentSection}>
            <h2>Financial Dashboard</h2>
            <p>Overview of your financial performance, earnings, and account status.</p>
          </div>
        );
      case 'transactions':
        return (
          <div className={styles.contentSection}>
            <h2>Transaction History</h2>
            <p>View all your sales, commissions, and financial transactions.</p>
          </div>
        );
      case 'payouts':
        return (
          <div className={styles.contentSection}>
            <h2>Payouts & Earnings</h2>
            <p>Track your earnings and payout schedule.</p>
          </div>
        );
      case 'stripe-setup':
        return (
          <div className={styles.contentSection}>
            <h2>Stripe Account Setup</h2>
            <p>Connect your Stripe account to start receiving payments.</p>
          </div>
        );
      case 'vendor-orders':
        return (
          <div className={styles.contentSection}>
            <VendorOrders />
          </div>
        );
      case 'platform-financials':
        return (
          <div className={styles.contentSection}>
            <h2>Platform Financials</h2>
            <p>Overview of platform-wide financial metrics and performance.</p>
          </div>
        );
      case 'commission-management':
        return (
          <div className={styles.contentSection}>
            <CommissionManagement />
          </div>
        );
      case 'vendor-settlements':
        return (
          <div className={styles.contentSection}>
            <h2>Vendor Settlements</h2>
            <p>Review and manage vendor payouts and settlements.</p>
          </div>
        );
      case 'financial-reports':
        return (
          <div className={styles.contentSection}>
            <h2>Financial Reports</h2>
            <p>Generate comprehensive financial reports and analytics.</p>
          </div>
        );
      case 'user-management':
        return (
          <div className={styles.contentSection}>
            <h2>User Management</h2>
            <UserManagement />
          </div>
        );
      case 'permissions-management':
        return (
          <div className={styles.contentSection}>
            <PermissionsManagement />
          </div>
        );
      case 'email-admin':
        return (
          <div className={styles.contentSection}>
            <EmailAdminDashboard />
          </div>
        );
      case 'email-preferences':
        return (
          <div className={styles.contentSection}>
            <EmailPreferences userId={userData.id} />
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
      case 'category-change-log':
        return (
          <div className={styles.contentSection}>
            <h2>Category Change Log</h2>
            <CategoryChangeLog />
          </div>
        );
      case 'event-management':
        return (
          <div className={styles.contentSection}>
            <EventManagement />
          </div>
        );
      case 'my-articles':
        return (
          <div className={styles.contentSection}>
            <ArticleManagement />
          </div>
        );
      case 'article-management':
        return (
          <div className={styles.contentSection}>
            <ArticleManagement />
          </div>
        );
      case 'sites-management':
        return (
          <div className={styles.contentSection}>
            <SitesManagement />
          </div>
        );
      case 'admin-sites-management':
        return (
          <div className={styles.contentSection}>
            <AdminSitesManagement />
          </div>
        );
      case 'announcements-management':
        return (
          <div className={styles.contentSection}>
            <AnnouncementsManagement />
          </div>
        );
      case 'terms-management':
        return (
          <div className={styles.contentSection}>
            <TermsManagement />
          </div>
        );
      case 'my-events':
        return <MyEventsSection userData={userData} />;
      case 'application-management':
        return <ApplicationManagementSection userData={userData} />;
      case 'my-applications':
        return <MyApplicationsSection userData={userData} />;
      case 'application-calendar':
        return <ApplicationCalendarSection userData={userData} />;
      case 'browse-events':
        return <BrowseEventsSection userData={userData} />;
      case 'application-history':
        return <ApplicationHistorySection userData={userData} />;
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
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'email-preferences' ? styles.active : ''}`}
                  onClick={() => setActiveSection('email-preferences')}
                >
                  Email Settings
                </button>
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

          {/* Finance section for vendors and admins */}
          {(hasVendorPermission || isAdmin) && (
            <div className={styles.sidebarSection}>
              <h3>Finance</h3>
              <ul>
                {/* All Users Finance Links */}
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'finance-dashboard' ? styles.active : ''}`}
                    onClick={() => setActiveSection('finance-dashboard')}
                  >
                    Financial Dashboard
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'transactions' ? styles.active : ''}`}
                    onClick={() => setActiveSection('transactions')}
                  >
                    Transaction History
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'payouts' ? styles.active : ''}`}
                    onClick={() => setActiveSection('payouts')}
                  >
                    Payouts & Earnings
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'stripe-setup' ? styles.active : ''}`}
                    onClick={() => setActiveSection('stripe-setup')}
                  >
                    Stripe Account Setup
                  </button>
                </li>
                
                {/* Admin Finance Links */}
                {isAdmin && (
                  <>
                    <li>
                      <button 
                        className={`${styles.sidebarLink} ${activeSection === 'platform-financials' ? styles.active : ''}`}
                        onClick={() => setActiveSection('platform-financials')}
                      >
                        Platform Financials
                      </button>
                    </li>
                    <li>
                      <button 
                        className={`${styles.sidebarLink} ${activeSection === 'commission-management' ? styles.active : ''}`}
                        onClick={() => setActiveSection('commission-management')}
                      >
                        Commission Management
                      </button>
                    </li>
                    <li>
                      <button 
                        className={`${styles.sidebarLink} ${activeSection === 'vendor-settlements' ? styles.active : ''}`}
                        onClick={() => setActiveSection('vendor-settlements')}
                      >
                        Vendor Settlements
                      </button>
                    </li>
                    <li>
                      <button 
                        className={`${styles.sidebarLink} ${activeSection === 'financial-reports' ? styles.active : ''}`}
                        onClick={() => setActiveSection('financial-reports')}
                      >
                        Financial Reports
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Event Applications section for artists */}
          <div className={styles.sidebarSection}>
            <h3>Event Applications</h3>
            <ul>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'my-applications' ? styles.active : ''}`}
                  onClick={() => setActiveSection('my-applications')}
                >
                  My Applications
                </button>
              </li>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'application-calendar' ? styles.active : ''}`}
                  onClick={() => setActiveSection('application-calendar')}
                >
                  Events Calendar
                </button>
              </li>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'browse-events' ? styles.active : ''}`}
                  onClick={() => setActiveSection('browse-events')}
                >
                  Browse Events
                </button>
              </li>
              <li>
                <button 
                  className={`${styles.sidebarLink} ${activeSection === 'application-history' ? styles.active : ''}`}
                  onClick={() => setActiveSection('application-history')}
                >
                  Application History
                </button>
              </li>
            </ul>
          </div>

          {/* Artist Website section for artists and admins */}
          {(userData.user_type === 'artist' || isAdmin) && (
            <div className={styles.sidebarSection}>
              <h3>Artist Website</h3>
              <ul>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'sites-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('sites-management')}
                  >
                    {isAdmin ? 'Create/Manage Site' : 'Manage Website'}
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Vendor section for users with vendor permissions or admins */}
          {(hasVendorPermission || isAdmin) && (
            <div className={styles.sidebarSection}>
              <h3>Vendor Tools</h3>
              <ul>
                <li>
                  <Link href="/dashboard/products" className={styles.sidebarLink}>
                    Manage Products
                  </Link>
                </li>
                <li>
                  <Link href="/products/new" className={styles.sidebarLink}>
                    Add New Product
                  </Link>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'vendor-orders' ? styles.active : ''}`}
                    onClick={() => setActiveSection('vendor-orders')}
                  >
                    Orders
                  </button>
                </li>
                <li>
                  <Link href="/dashboard/inventory" className={styles.sidebarLink}>
                    Inventory Management
                  </Link>
                </li>
                <li>
                  <Link href="/policies" className={styles.sidebarLink}>
                    Manage Custom Policies
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {canManageArticles && (
            <div className={styles.sidebarSection}>
              <h3>Articles</h3>
              <ul>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'my-articles' ? styles.active : ''}`}
                    onClick={() => setActiveSection('my-articles')}
                  >
                    My Articles
                  </button>
                </li>
                {canManageArticles && (
                  <li>
                    <button 
                      className={`${styles.sidebarLink} ${activeSection === 'article-management' ? styles.active : ''}`}
                      onClick={() => setActiveSection('article-management')}
                    >
                      Manage All Articles
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {canManageSystem && (
            <div className={styles.sidebarSection}>
              <h3>System Management</h3>
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
                    className={`${styles.sidebarLink} ${activeSection === 'permissions-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('permissions-management')}
                  >
                    Permissions Management
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'email-admin' ? styles.active : ''}`}
                    onClick={() => setActiveSection('email-admin')}
                  >
                    Email Administration
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'announcements-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('announcements-management')}
                  >
                    Announcements Management
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'terms-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('terms-management')}
                  >
                    Terms & Conditions
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
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'category-change-log' ? styles.active : ''}`}
                    onClick={() => setActiveSection('category-change-log')}
                  >
                    Category Change Log
                  </button>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'event-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('event-management')}
                  >
                    Event Management
                  </button>
                </li>
                <li>
                  <Link href="/policies/admin" className={styles.sidebarLink}>
                    Policy Management
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {canManageSites && (
            <div className={styles.sidebarSection}>
              <h3>Site Management</h3>
              <ul>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'admin-sites-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('admin-sites-management')}
                  >
                    Manage All Sites
                  </button>
                </li>
              </ul>
            </div>
          )}

          {canManageEvents && (
            <div className={styles.sidebarSection}>
              <h3>Events</h3>
              <ul>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'my-events' ? styles.active : ''}`}
                    onClick={() => setActiveSection('my-events')}
                  >
                    My Events
                  </button>
                </li>
                <li>
                  <Link href="/events/new" className={styles.sidebarLink}>
                    Create New Event
                  </Link>
                </li>
                <li>
                  <button 
                    className={`${styles.sidebarLink} ${activeSection === 'application-management' ? styles.active : ''}`}
                    onClick={() => setActiveSection('application-management')}
                  >
                    Application Management
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

// My Events Section Component
function MyEventsSection({ userData }) {
  const [currentEvents, setCurrentEvents] = useState([]);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = getAuthToken();
      
      // Fetch current events (draft and active)
      const currentResponse = await fetch(`https://api2.onlineartfestival.com/api/events?promoter_id=${userData.id}&event_status=draft,active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch archived events
      const archivedResponse = await fetch(`https://api2.onlineartfestival.com/api/events?promoter_id=${userData.id}&event_status=archived`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!currentResponse.ok || !archivedResponse.ok) {
        throw new Error('Failed to fetch events');
      }

      const currentData = await currentResponse.json();
      const archivedData = await archivedResponse.json();
      
      setCurrentEvents(currentData);
      setArchivedEvents(archivedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (eventId) => {
    // For now, redirect to admin event management - we can create a promoter edit page later
    router.push(`/dashboard?section=event-management`);
  };

  const handleView = (eventId) => {
    // Future: redirect to public event page
    router.push(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <h2>My Events</h2>
        <div className={styles.loading}>Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.contentSection}>
        <h2>My Events</h2>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  const currentEventsToShow = currentEvents;
  const archivedEventsToShow = archivedEvents;
  const eventsToShow = activeTab === 'current' ? currentEventsToShow : archivedEventsToShow;
  const totalCurrent = currentEvents.length;
  const totalArchived = archivedEvents.length;

  return (
    <div className={styles.contentSection}>
      <div className={styles.header}>
        <h2>My Events</h2>
        <Link href="/events/new" className={styles.primaryButton}>
          Create New Event
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'current' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('current')}
        >
          Current Events ({totalCurrent})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'archived' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived Events ({totalArchived})
        </button>
      </div>

      {/* Events Table */}
      {eventsToShow.length === 0 ? (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <h3>
              {activeTab === 'current' ? 'No Current Events' : 'No Archived Events'}
            </h3>
            <p>
              {activeTab === 'current' 
                ? "You haven't created any events yet. Get started by creating your first event!"
                : "You don't have any archived events yet."
              }
            </p>
            {activeTab === 'current' && (
              <div className={styles.quickActions}>
                <Link href="/events/new" className={styles.primaryButton}>
                  Create Your First Event
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Applications</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eventsToShow.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.title}</strong>
                  </td>
                  <td>{event.event_type_name || 'N/A'}</td>
                  <td>
                    {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`${styles.status} ${styles[event.event_status]}`}>
                      {event.event_status}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.status} ${styles[event.application_status?.replace('_', '')]}`}>
                      {event.application_status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {event.venue_city && event.venue_state ? 
                      `${event.venue_city}, ${event.venue_state}` : 
                      event.venue_name || 'TBD'
                    }
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => handleView(event.id)}
                        title="View Event (Coming Soon)"
                      >
                        View
                      </button>
                      <button
                        className={styles.primaryButton}
                        onClick={() => handleEdit(event.id)}
                        title="Edit Event"
                      >
                        {activeTab === 'archived' ? 'Renew' : 'Edit'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Application Management Section Component (for Promoters)
function ApplicationManagementSection({ userData }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPromoterEvents();
  }, []);

  const fetchPromoterEvents = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to manage applications');
      }

      const response = await fetch(`https://api2.onlineartfestival.com/api/events?promoter_id=${userData.id}&allow_applications=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data);
      
      // Auto-select first event if available
      if (data.length > 0) {
        setSelectedEvent(data[0]);
        fetchApplications(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (eventId) => {
    setApplicationsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/events/${eventId}/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    fetchApplications(event.id);
  };

  const updateApplicationStatus = async (applicationId, status, juryComments = '') => {
    try {
      const token = getAuthToken();
      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          jury_comments: juryComments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update application status');
      }

      // Refresh applications after status update
      if (selectedEvent) {
        fetchApplications(selectedEvent.id);
      }
    } catch (err) {
      console.error('Error updating application status:', err);
      alert('Failed to update application status: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'gray',
      'submitted': 'blue',
      'under_review': 'yellow',
      'accepted': 'green',
      'rejected': 'red',
      'declined': 'gray',
      'confirmed': 'green',
      'waitlisted': 'orange'
    };
    return colors[status] || 'gray';
  };

  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === statusFilter);

  const applicationStats = applications.reduce((stats, app) => {
    stats[app.status] = (stats[app.status] || 0) + 1;
    return stats;
  }, {});

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <h2>Application Management</h2>
        <div className={styles.loading}>Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.contentSection}>
        <h2>Application Management</h2>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={styles.contentSection}>
        <h2>Application Management</h2>
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <h3>No Events Accepting Applications</h3>
            <p>You don't have any events that accept applications yet.</p>
            <div className={styles.quickActions}>
              <Link href="/events/new" className={styles.primaryButton}>
                Create New Event
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.header}>
        <h2>Application Management</h2>
        <div className={styles.eventSelector}>
          <select 
            value={selectedEvent?.id || ''} 
            onChange={(e) => {
              const event = events.find(ev => ev.id == e.target.value);
              if (event) handleEventSelect(event);
            }}
            className={styles.filterSelect}
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} ({event.application_status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedEvent && (
        <div className={styles.eventDetails}>
          <div className={styles.eventInfo}>
            <h3>{selectedEvent.title}</h3>
            <p>
              <strong>Date:</strong> {formatDate(selectedEvent.start_date)} - {formatDate(selectedEvent.end_date)}
            </p>
            <p>
              <strong>Application Status:</strong> 
              <span className={`${styles.statusBadge} ${styles[selectedEvent.application_status?.replace('_', '')]}`}>
                {selectedEvent.application_status?.replace('_', ' ')}
              </span>
            </p>
          </div>

          {/* Application Statistics */}
          <div className={styles.applicationStats}>
            <h4>Application Statistics</h4>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{applications.length}</span>
                <span className={styles.statLabel}>Total Applications</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{applicationStats.submitted || 0}</span>
                <span className={styles.statLabel}>Submitted</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{applicationStats.under_review || 0}</span>
                <span className={styles.statLabel}>Under Review</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{applicationStats.accepted || 0}</span>
                <span className={styles.statLabel}>Accepted</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{applicationStats.confirmed || 0}</span>
                <span className={styles.statLabel}>Confirmed</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{applicationStats.waitlisted || 0}</span>
                <span className={styles.statLabel}>Waitlisted</span>
              </div>
            </div>
          </div>

          {/* Filter and Applications List */}
          <div className={styles.applicationsSection}>
            <div className={styles.applicationsHeader}>
              <h4>Applications</h4>
              <div className={styles.filterContainer}>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Applications ({applications.length})</option>
                  <option value="submitted">Submitted ({applicationStats.submitted || 0})</option>
                  <option value="under_review">Under Review ({applicationStats.under_review || 0})</option>
                  <option value="accepted">Accepted ({applicationStats.accepted || 0})</option>
                  <option value="confirmed">Confirmed ({applicationStats.confirmed || 0})</option>
                  <option value="waitlisted">Waitlisted ({applicationStats.waitlisted || 0})</option>
                  <option value="rejected">Rejected ({applicationStats.rejected || 0})</option>
                </select>
              </div>
            </div>

            {/* Bulk Acceptance Interface for Submitted Applications */}
            {statusFilter === 'submitted' && (
              <BulkAcceptanceInterface 
                applications={filteredApplications}
                selectedEvent={selectedEvent}
                onBulkAccept={() => fetchApplications(selectedEvent.id)}
              />
            )}

            {/* Payment Dashboard Interface for Accepted Applications */}
            {statusFilter === 'accepted' && (
              <PaymentDashboard 
                applications={filteredApplications}
                selectedEvent={selectedEvent}
                onRefresh={() => fetchApplications(selectedEvent.id)}
              />
            )}

            {applicationsLoading ? (
              <div className={styles.loading}>Loading applications...</div>
            ) : filteredApplications.length === 0 ? (
              <div className={styles.overviewCard}>
                <h4>No Applications Found</h4>
                <p>
                  {statusFilter === 'all' 
                    ? 'No applications have been submitted for this event yet.' 
                    : `No applications with status "${statusFilter.replace('_', ' ')}".`
                  }
                </p>
              </div>
            ) : (
              <div className={styles.applicationsGrid}>
                {filteredApplications.map((application) => (
                  <ApplicationCard 
                    key={application.id} 
                    application={application} 
                    onStatusUpdate={updateApplicationStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Application Card Component for Promoter Review
function ApplicationCard({ application, onStatusUpdate }) {
  const [showDetails, setShowDetails] = useState(false);
  const [juryComments, setJuryComments] = useState(application.jury_comments || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(application.id, newStatus, juryComments);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'gray',
      'submitted': 'blue',
      'under_review': 'yellow',
      'accepted': 'green',
      'rejected': 'red',
      'declined': 'gray',
      'confirmed': 'green',
      'waitlisted': 'orange'
    };
    return colors[status] || 'gray';
  };

  return (
    <div className={styles.applicationCard}>
      <div className={styles.applicationHeader}>
        <div className={styles.applicantInfo}>
          <h4>{application.artist_name}</h4>
          <p>Applied: {formatDate(application.applied_date)}</p>
        </div>
        <span className={`${styles.statusBadge} ${styles[getStatusColor(application.status)]}`}>
          {application.status.replace('_', ' ')}
        </span>
      </div>

      <div className={styles.applicationSummary}>
        {application.artist_statement && (
          <p><strong>Artist Statement:</strong> {application.artist_statement.substring(0, 150)}...</p>
        )}
        {application.portfolio_url && (
          <p><strong>Portfolio:</strong> <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer">View Portfolio</a></p>
        )}
        <p><strong>Booth Preferences:</strong> {application.booth_preferences || 'None specified'}</p>
        {application.total_fees > 0 && (
          <p><strong>Fees:</strong> ${parseFloat(application.total_fees).toFixed(2)}</p>
        )}
      </div>

      <div className={styles.applicationActions}>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className={styles.secondaryButton}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {application.status === 'submitted' && (
          <button 
            onClick={() => handleStatusUpdate('under_review')}
            disabled={isUpdating}
            className={styles.primaryButton}
          >
            Start Review
          </button>
        )}

        {(application.status === 'submitted' || application.status === 'under_review') && (
          <>
            <button 
              onClick={() => handleStatusUpdate('accepted')}
              disabled={isUpdating}
              className={styles.successButton}
            >
              Accept
            </button>
            <button 
              onClick={() => handleStatusUpdate('waitlisted')}
              disabled={isUpdating}
              className={styles.warningButton}
            >
              Waitlist
            </button>
            <button 
              onClick={() => handleStatusUpdate('rejected')}
              disabled={isUpdating}
              className={styles.dangerButton}
            >
              Reject
            </button>
          </>
        )}
      </div>

      {showDetails && (
        <div className={styles.applicationDetails}>
          <h5>Full Application Details</h5>
          
          {application.artist_statement && (
            <div className={styles.detailSection}>
              <strong>Artist Statement:</strong>
              <p>{application.artist_statement}</p>
            </div>
          )}

          {application.booth_preferences && (
            <div className={styles.detailSection}>
              <strong>Booth Preferences:</strong>
              <p>{application.booth_preferences}</p>
            </div>
          )}

          {application.special_requests && (
            <div className={styles.detailSection}>
              <strong>Special Requests:</strong>
              <p>{application.special_requests}</p>
            </div>
          )}

          <div className={styles.detailSection}>
            <strong>Jury Comments:</strong>
            <textarea
              value={juryComments}
              onChange={(e) => setJuryComments(e.target.value)}
              placeholder="Add comments about this application..."
              className={styles.juryComments}
              rows={3}
            />
            <button 
              onClick={() => onStatusUpdate(application.id, application.status, juryComments)}
              className={styles.secondaryButton}
              disabled={isUpdating}
            >
              Save Comments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Bulk Acceptance Interface Component
function BulkAcceptanceInterface({ applications, selectedEvent, onBulkAccept }) {
  const [selectedApps, setSelectedApps] = useState([]);
  const [bulkBoothFee, setBulkBoothFee] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkTimezone, setBulkTimezone] = useState('America/New_York');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedApps(applications.map(app => app.id));
    } else {
      setSelectedApps([]);
    }
  };

  const handleSelectApp = (appId, checked) => {
    if (checked) {
      setSelectedApps([...selectedApps, appId]);
    } else {
      setSelectedApps(selectedApps.filter(id => id !== appId));
    }
  };

  const handleBulkAccept = async () => {
    if (selectedApps.length === 0) {
      alert('Please select at least one application');
      return;
    }

    if (!bulkBoothFee || !bulkDueDate) {
      alert('Please enter booth fee and due date');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Accepting applications...');

    try {
      const token = getAuthToken();
      
      // Prepare applications for bulk acceptance
      const applicationsToAccept = selectedApps.map(appId => ({
        application_id: appId,
        booth_fee_amount: parseFloat(bulkBoothFee),
        due_date: bulkDueDate,
        due_date_timezone: bulkTimezone,
        add_ons: [] // Add-ons can be added later
      }));

      // Step 1: Bulk accept applications
      const acceptResponse = await fetch('https://api2.onlineartfestival.com/api/applications/bulk-accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ applications: applicationsToAccept })
      });

      if (!acceptResponse.ok) {
        throw new Error('Failed to accept applications');
      }

      const acceptResult = await acceptResponse.json();
      
      if (acceptResult.errors.length > 0) {
        console.warn('Some applications failed to accept:', acceptResult.errors);
      }

      setProcessingStep('Creating payment intents...');

      // Step 2: Create payment intents
      const paymentResponse = await fetch('https://api2.onlineartfestival.com/api/applications/bulk-payment-intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ application_ids: selectedApps })
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment intents');
      }

      const paymentResult = await paymentResponse.json();

      setProcessingStep('Sending acceptance emails...');

      // Step 3: Send acceptance emails (handled by email service)
      // This would typically be triggered by the bulk-accept endpoint

      alert(`Successfully processed ${acceptResult.processed} applications! ${paymentResult.created} payment intents created.`);
      
      // Reset form
      setSelectedApps([]);
      setBulkBoothFee('');
      setBulkDueDate('');
      
      // Refresh applications
      onBulkAccept();

    } catch (error) {
      console.error('Error in bulk acceptance:', error);
      alert('Failed to process bulk acceptance: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <div className={styles.bulkAcceptanceInterface}>
      <div className={styles.bulkHeader}>
        <h4>🎪 Bulk Acceptance Interface</h4>
        <p>Select applications to accept and set booth fees</p>
      </div>

      <div className={styles.bulkControls}>
        <div className={styles.bulkInputGroup}>
          <label htmlFor="bulkBoothFee">Booth Fee (USD)</label>
          <input
            id="bulkBoothFee"
            type="number"
            value={bulkBoothFee}
            onChange={(e) => setBulkBoothFee(e.target.value)}
            placeholder="500.00"
            step="0.01"
            min="0"
            className={styles.bulkInput}
          />
        </div>
        
        <div className={styles.bulkInputGroup}>
          <label htmlFor="bulkDueDate">Payment Due Date</label>
          <input
            id="bulkDueDate"
            type="datetime-local"
            value={bulkDueDate}
            onChange={(e) => setBulkDueDate(e.target.value)}
            className={styles.bulkInput}
          />
        </div>

        <div className={styles.bulkInputGroup}>
          <label htmlFor="bulkTimezone">Timezone</label>
          <select
            id="bulkTimezone"
            value={bulkTimezone}
            onChange={(e) => setBulkTimezone(e.target.value)}
            className={styles.bulkInput}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
      </div>

      <div className={styles.bulkActions}>
        <button 
          onClick={() => handleSelectAll(selectedApps.length !== applications.length)}
          className={styles.selectAllButton}
        >
          {selectedApps.length === applications.length ? 'Deselect All' : 'Select All'}
        </button>
        
        <button 
          onClick={handleBulkAccept}
          disabled={isProcessing || selectedApps.length === 0}
          className={styles.bulkAcceptButton}
        >
          {isProcessing ? `${processingStep}` : `Accept Selected (${selectedApps.length})`}
        </button>
      </div>

      <div className={styles.bulkApplicationsList}>
        {applications.map((application) => (
          <div key={application.id} className={styles.bulkApplicationItem}>
            <div className={styles.bulkCheckbox}>
              <input
                type="checkbox"
                checked={selectedApps.includes(application.id)}
                onChange={(e) => handleSelectApp(application.id, e.target.checked)}
              />
            </div>
            <div className={styles.bulkApplicationInfo}>
              <h5>{application.artist_first_name} {application.artist_last_name}</h5>
              <p><strong>Business:</strong> {application.artist_business_name || 'N/A'}</p>
              <p><strong>Categories:</strong> {application.art_categories || 'N/A'}</p>
              <p><strong>Submitted:</strong> {new Date(application.submitted_at).toLocaleDateString()}</p>
              {application.portfolio_url && (
                <p><strong>Portfolio:</strong> <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer">View Portfolio</a></p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Payment Dashboard Component
function PaymentDashboard({ applications, selectedEvent, onRefresh }) {
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [selectedForReminder, setSelectedForReminder] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentDashboard();
  }, [selectedEvent]);

  const fetchPaymentDashboard = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/payment-dashboard/${selectedEvent.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment dashboard');
      }

      const data = await response.json();
      setPaymentSummary(data.summary);
    } catch (error) {
      console.error('Error fetching payment dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async (reminderType = 'manual') => {
    if (selectedForReminder.length === 0) {
      alert('Please select applications to send reminders to');
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch('https://api2.onlineartfestival.com/api/applications/send-payment-reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_ids: selectedForReminder,
          reminder_type: reminderType,
          custom_message: customMessage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send reminders');
      }

      const result = await response.json();
      alert(`Sent ${result.sent} reminders successfully!`);
      
      setSelectedForReminder([]);
      setCustomMessage('');
      onRefresh();
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Failed to send reminders: ' + error.message);
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'green';
      case 'pending': return 'yellow';
      case 'overdue': return 'red';
      default: return 'gray';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <div className={styles.loading}>Loading payment dashboard...</div>;
  }

  return (
    <div className={styles.paymentDashboard}>
      <div className={styles.paymentHeader}>
        <h4>💰 Payment Dashboard</h4>
        <p>Track booth fee payments and send reminders</p>
      </div>

      {paymentSummary && (
        <div className={styles.paymentSummary}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber} style={{color: 'green'}}>
                {paymentSummary.paid_count || 0}
              </span>
              <span className={styles.summaryLabel}>Paid</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber} style={{color: 'orange'}}>
                {paymentSummary.pending_count || 0}
              </span>
              <span className={styles.summaryLabel}>Pending</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber} style={{color: 'red'}}>
                {paymentSummary.overdue_count || 0}
              </span>
              <span className={styles.summaryLabel}>Overdue</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber} style={{color: 'green'}}>
                {formatCurrency(paymentSummary.total_collected || 0)}
              </span>
              <span className={styles.summaryLabel}>Collected</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.paymentControls}>
        <div className={styles.reminderControls}>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Optional custom message for reminders..."
            className={styles.customMessageInput}
          />
          <div className={styles.reminderButtons}>
            <button 
              onClick={() => handleSendReminders('manual')}
              className={styles.reminderButton}
            >
              Send Manual Reminder ({selectedForReminder.length})
            </button>
            <button 
              onClick={() => handleSendReminders('due_soon')}
              className={styles.reminderButton}
            >
              Send Due Soon Notice ({selectedForReminder.length})
            </button>
          </div>
        </div>
      </div>

      <div className={styles.paymentApplicationsList}>
        {applications.map((application) => {
          const dueDate = new Date(application.booth_fee_due_date);
          const now = new Date();
          const isOverdue = dueDate < now && !application.booth_fee_paid;
          const daysTilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

          return (
            <div key={application.id} className={styles.paymentApplicationItem}>
              <div className={styles.paymentCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedForReminder.includes(application.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForReminder([...selectedForReminder, application.id]);
                    } else {
                      setSelectedForReminder(selectedForReminder.filter(id => id !== application.id));
                    }
                  }}
                />
              </div>
              <div className={styles.paymentApplicationInfo}>
                <h5>{application.artist_first_name} {application.artist_last_name}</h5>
                <div className={styles.paymentDetails}>
                  <p><strong>Booth Fee:</strong> {formatCurrency(application.booth_fee_amount)}</p>
                  <p><strong>Due Date:</strong> {dueDate.toLocaleDateString()}</p>
                  <p><strong>Status:</strong> 
                    <span className={styles.paymentStatus} style={{color: getPaymentStatusColor(application.payment_status)}}>
                      {application.booth_fee_paid ? 'PAID' : isOverdue ? 'OVERDUE' : `${daysTilDue} days remaining`}
                    </span>
                  </p>
                  {application.payment_intent_id && !application.booth_fee_paid && (
                    <p><strong>Payment Link:</strong> 
                      <a 
                        href={`/event-payment/${application.payment_intent_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.paymentLink}
                      >
                        🔗 Artist Payment Page
                      </a>
                      <button 
                        className={styles.copyLinkButton}
                        onClick={() => {
                          const paymentUrl = `/event-payment/${application.payment_intent_id}`;
                          navigator.clipboard.writeText(`${window.location.origin}${paymentUrl}`);
                          alert('Payment link copied to clipboard!');
                        }}
                      >
                        📋 Copy
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// My Applications Section Component
function MyApplicationsSection({ userData }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view applications');
      }

      const response = await fetch('https://api2.onlineartfestival.com/api/applications/my-applications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'gray',
      'submitted': 'blue',
      'under_review': 'yellow',
      'accepted': 'green',
      'rejected': 'red',
      'declined': 'gray',
      'confirmed': 'green',
      'waitlisted': 'orange'
    };
    return colors[status] || 'gray';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <h2>My Applications</h2>
        <div className={styles.loading}>Loading applications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.contentSection}>
        <h2>My Applications</h2>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.header}>
        <h2>My Applications</h2>
        <Link href="/events" className={styles.primaryButton}>
          Browse Events
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <h3>No Applications Yet</h3>
            <p>You haven't applied to any events yet. Start exploring events and apply to showcase your art!</p>
            <div className={styles.quickActions}>
              <Link href="/events" className={styles.primaryButton}>
                Browse Events
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th>Fees</th>
                <th>Event Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <strong>{app.event_title}</strong>
                    <br />
                    <small>{app.event_location}</small>
                  </td>
                  <td>{formatDate(app.applied_date)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[getStatusColor(app.status)]}`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {app.total_fees > 0 ? `$${parseFloat(app.total_fees).toFixed(2)}` : 'Free'}
                  </td>
                  <td>{formatDate(app.event_start_date)}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Link 
                        href={`/events/${app.event_id}`} 
                        className={styles.secondaryButton}
                      >
                        View Event
                      </Link>
                      {app.status === 'draft' && (
                        <button className={styles.primaryButton}>
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Application Calendar Section Component
function ApplicationCalendarSection({ userData }) {
  const [events, setEvents] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddCustomEvent, setShowAddCustomEvent] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view your calendar');
      }

      // Fetch application events
      const applicationsResponse = await fetch('https://api2.onlineartfestival.com/api/applications/my-applications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch custom events
      const customEventsResponse = await fetch('https://api2.onlineartfestival.com/api/events/my-events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        // Filter to show only relevant statuses (hide rejected/declined)
        const relevantEvents = applicationsData.filter(app => 
          !['rejected', 'declined'].includes(app.status)
        );
        setEvents(relevantEvents);
      }

      if (customEventsResponse.ok) {
        const customData = await customEventsResponse.json();
        setCustomEvents(customData);
      } else if (customEventsResponse.status !== 404) {
        console.error('Failed to fetch custom events');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCustomEvent = async (eventData) => {
    try {
      const token = getAuthToken();
      const response = await fetch('https://api2.onlineartfestival.com/api/events/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        fetchCalendarData(); // Refresh data
        setShowAddCustomEvent(false);
      } else {
        throw new Error('Failed to add custom event');
      }
    } catch (err) {
      alert('Error adding custom event: ' + err.message);
    }
  };

  const getEventsByDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const applicationEvents = events.filter(event => {
      const eventStart = new Date(event.event_start_date).toISOString().split('T')[0];
      const eventEnd = new Date(event.event_end_date).toISOString().split('T')[0];
      return dateStr >= eventStart && dateStr <= eventEnd;
    });

    const customEventsForDate = customEvents.filter(event => {
      const eventStart = new Date(event.event_start_date).toISOString().split('T')[0];
      const eventEnd = new Date(event.event_end_date).toISOString().split('T')[0];
      return dateStr >= eventStart && dateStr <= eventEnd;
    });

    return [...applicationEvents, ...customEventsForDate];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEventTypeLabel = (event) => {
    if (event.event_title) {
      // Application event
      switch (event.status) {
        case 'submitted': return 'Applied';
        case 'under_review': return 'Under Review';
        case 'accepted': return 'Accepted';
        case 'confirmed': return 'Exhibiting';
        case 'waitlisted': return 'Waitlisted';
        default: return 'Applied';
      }
    } else {
      // Custom event
      return 'Personal Event';
    }
  };

  const getEventColor = (event) => {
    if (event.event_title) {
      // Application event colors
      switch (event.status) {
        case 'submitted': return 'blue';
        case 'under_review': return 'yellow';
        case 'accepted': return 'green';
        case 'confirmed': return 'green';
        case 'waitlisted': return 'orange';
        default: return 'blue';
      }
    } else {
      // Custom event color
      return 'purple';
    }
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <h2>Events Calendar</h2>
        <div className={styles.loading}>Loading your calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.contentSection}>
        <h2>Events Calendar</h2>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.header}>
        <h2>Events Calendar</h2>
        <div className={styles.calendarActions}>
          <button 
            onClick={() => setShowAddCustomEvent(true)}
            className={styles.primaryButton}
          >
            Add Custom Event
          </button>
        </div>
      </div>

      {/* Calendar Summary */}
      <div className={styles.calendarSummary}>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryNumber}>
              {events.filter(e => e.status === 'confirmed').length}
            </span>
            <span className={styles.summaryLabel}>Exhibiting</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryNumber}>
              {events.filter(e => ['submitted', 'under_review', 'accepted'].includes(e.status)).length}
            </span>
            <span className={styles.summaryLabel}>Applied</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryNumber}>
              {events.filter(e => e.status === 'waitlisted').length}
            </span>
            <span className={styles.summaryLabel}>Waitlisted</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryNumber}>{customEvents.length}</span>
            <span className={styles.summaryLabel}>Custom Events</span>
          </div>
        </div>
      </div>

      {/* Events List View */}
      <div className={styles.eventsListView}>
        <h3>Upcoming Events</h3>
        
        {events.length === 0 && customEvents.length === 0 ? (
          <div className={styles.overviewCard}>
            <h4>No Events in Your Calendar</h4>
            <p>Start by applying to events or adding your own custom events!</p>
            <div className={styles.quickActions}>
              <Link href="/events" className={styles.primaryButton}>
                Browse Events
              </Link>
              <button 
                onClick={() => setShowAddCustomEvent(true)}
                className={styles.secondaryButton}
              >
                Add Custom Event
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.eventsTimeline}>
            {/* Application Events */}
            {events.map((event) => (
              <div key={`app-${event.id}`} className={styles.timelineEvent}>
                <div className={`${styles.eventDot} ${styles[getEventColor(event)]}`}></div>
                <div className={styles.eventContent}>
                  <div className={styles.eventHeader}>
                    <h4>{event.event_title}</h4>
                    <span className={`${styles.statusBadge} ${styles[getEventColor(event)]}`}>
                      {getEventTypeLabel(event)}
                    </span>
                  </div>
                  <p className={styles.eventDate}>
                    {formatDate(event.event_start_date)} - {formatDate(event.event_end_date)}
                  </p>
                  <p className={styles.eventLocation}>{event.event_location}</p>
                  <div className={styles.eventActions}>
                    <Link 
                      href={`/events/${event.event_id}`} 
                      className={styles.secondaryButton}
                    >
                      View Event
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Custom Events */}
            {customEvents.map((event) => (
              <div key={`custom-${event.id}`} className={styles.timelineEvent}>
                <div className={`${styles.eventDot} ${styles.purple}`}></div>
                <div className={styles.eventContent}>
                  <div className={styles.eventHeader}>
                    <h4>{event.event_name}</h4>
                    <span className={`${styles.statusBadge} ${styles.purple}`}>
                      Personal Event
                    </span>
                  </div>
                  <p className={styles.eventDate}>
                    {formatDate(event.event_start_date)} - {formatDate(event.event_end_date)}
                  </p>
                  <p className={styles.eventLocation}>
                    {event.venue_name}
                    {event.venue_city && `, ${event.venue_city}`}
                    {event.venue_state && `, ${event.venue_state}`}
                  </p>
                  {event.website && (
                    <p className={styles.eventWebsite}>
                      <a href={event.website} target="_blank" rel="noopener noreferrer">
                        Event Website
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Event Modal */}
      {showAddCustomEvent && (
        <CustomEventModal 
          onSave={addCustomEvent}
          onCancel={() => setShowAddCustomEvent(false)}
        />
      )}
    </div>
  );
}

// Browse Events Section Component
function BrowseEventsSection({ userData }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('https://api2.onlineartfestival.com/api/events?allow_applications=1&application_status=accepting');
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <h2>Browse Events</h2>
        <div className={styles.loading}>Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.contentSection}>
        <h2>Browse Events</h2>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.header}>
        <h2>Browse Events</h2>
        <p>Find events accepting artist applications</p>
      </div>

      {events.length === 0 ? (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <h3>No Events Available</h3>
            <p>There are currently no events accepting applications. Check back soon!</p>
          </div>
        </div>
      ) : (
        <div className={styles.eventsGrid}>
          {events.map((event) => (
            <div key={event.id} className={styles.eventCard}>
              <h3>{event.title}</h3>
              <p className={styles.eventMeta}>
                <strong>Type:</strong> {event.event_type_name}
              </p>
              <p className={styles.eventMeta}>
                <strong>Date:</strong> {formatDate(event.start_date)} - {formatDate(event.end_date)}
              </p>
              <p className={styles.eventMeta}>
                <strong>Location:</strong> {event.venue_city}, {event.venue_state}
              </p>
              {event.application_deadline && (
                <p className={styles.eventMeta}>
                  <strong>Deadline:</strong> {formatDate(event.application_deadline)}
                </p>
              )}
              <div className={styles.eventFees}>
                {event.application_fee > 0 && (
                  <span>App Fee: ${parseFloat(event.application_fee).toFixed(2)}</span>
                )}
                {event.jury_fee > 0 && (
                  <span>Jury Fee: ${parseFloat(event.jury_fee).toFixed(2)}</span>
                )}
              </div>
              <div className={styles.actionButtons}>
                <Link 
                  href={`/events/${event.id}`} 
                  className={styles.primaryButton}
                >
                  View & Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Application History Section Component
function ApplicationHistorySection({ userData }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view application history');
      }

      const response = await fetch('https://api2.onlineartfestival.com/api/applications/my-applications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch application history');
      }

      const data = await response.json();
      setApplications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = filterStatus === 'all' 
    ? applications 
    : applications.filter(app => app.status === filterStatus);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <h2>Application History</h2>
        <div className={styles.loading}>Loading application history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.contentSection}>
        <h2>Application History</h2>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.header}>
        <h2>Application History</h2>
        <div className={styles.filterContainer}>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Applications</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="accepted">Accepted</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="waitlisted">Waitlisted</option>
          </select>
        </div>
      </div>

      {filteredApplications.length === 0 ? (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <h3>No Applications Found</h3>
            <p>
              {filterStatus === 'all' 
                ? "You haven't applied to any events yet." 
                : `No applications with status "${filterStatus.replace('_', ' ')}".`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.historyGrid}>
          {filteredApplications.map((app) => (
            <div key={app.id} className={styles.historyCard}>
              <div className={styles.historyHeader}>
                <h3>{app.event_title}</h3>
                <span className={`${styles.statusBadge} ${styles[app.status]}`}>
                  {app.status.replace('_', ' ')}
                </span>
              </div>
              <div className={styles.historyDetails}>
                <p><strong>Applied:</strong> {formatDate(app.applied_date)}</p>
                <p><strong>Event Date:</strong> {formatDate(app.event_start_date)}</p>
                <p><strong>Location:</strong> {app.event_location}</p>
                {app.jury_comments && (
                  <div className={styles.comments}>
                    <strong>Comments:</strong>
                    <p>{app.jury_comments}</p>
                  </div>
                )}
              </div>
              <div className={styles.actionButtons}>
                <Link 
                  href={`/events/${app.event_id}`} 
                  className={styles.secondaryButton}
                >
                  View Event
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Custom Event Modal Component
function CustomEventModal({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    event_name: '',
    event_start_date: '',
    event_end_date: '',
    venue_name: '',
    city: '',
    state: '',
    website: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
    } catch (err) {
      console.error('Error saving custom event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Add Custom Event</h3>
          <button 
            onClick={onCancel}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="event_name">Event Name *</label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              required
              className={styles.formInput}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="event_start_date">Start Date *</label>
              <input
                type="date"
                id="event_start_date"
                name="event_start_date"
                value={formData.event_start_date}
                onChange={handleChange}
                required
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="event_end_date">End Date *</label>
              <input
                type="date"
                id="event_end_date"
                name="event_end_date"
                value={formData.event_end_date}
                onChange={handleChange}
                required
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="venue_name">Venue Name</label>
            <input
              type="text"
              id="venue_name"
              name="venue_name"
              value={formData.venue_name}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="website">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.modalActions}>
            <button 
              type="button" 
              onClick={onCancel}
              className={styles.secondaryButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Admin Sites Management Section Component
function AdminSitesManagement() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllSites();
  }, []);

  const fetchAllSites = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to manage sites');
      }

      const response = await fetch('https://api2.onlineartfestival.com/api/sites/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }

      const data = await response.json();
      setSites(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return styles.activeBadge;
      case 'draft': return styles.draftBadge;
      case 'inactive': return styles.inactiveBadge;
      default: return styles.defaultBadge;
    }
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <h2>Manage All Sites</h2>
        <div className={styles.loading}>Loading sites...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.contentSection}>
        <h2>Manage All Sites</h2>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.header}>
        <h2>Manage All Sites</h2>
        <p>View and manage all artist websites in the system</p>
      </div>

      {sites.length === 0 ? (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <h3>No Sites Found</h3>
            <p>No artist websites have been created yet.</p>
          </div>
        </div>
      ) : (
        <div className={styles.sitesTable}>
          <div className={styles.tableHeader}>
            <div className={styles.tableRow}>
              <div className={styles.tableCell}>Artist</div>
              <div className={styles.tableCell}>Site Name</div>
              <div className={styles.tableCell}>Subdomain</div>
              <div className={styles.tableCell}>Custom Domain</div>
              <div className={styles.tableCell}>Status</div>
              <div className={styles.tableCell}>Created</div>
              <div className={styles.tableCell}>Actions</div>
            </div>
          </div>
          <div className={styles.tableBody}>
            {sites.map((site) => (
              <div key={site.id} className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <strong>{site.first_name} {site.last_name}</strong>
                  <br />
                  <span className={styles.userEmail}>{site.email}</span>
                </div>
                <div className={styles.tableCell}>
                  {site.site_name}
                  {site.site_title && (
                    <div className={styles.siteSubtitle}>{site.site_title}</div>
                  )}
                </div>
                <div className={styles.tableCell}>
                  <code className={styles.subdomainCode}>{site.subdomain}</code>
                </div>
                <div className={styles.tableCell}>
                  {site.custom_domain ? (
                    <code className={styles.domainCode}>{site.custom_domain}</code>
                  ) : (
                    <span className={styles.noDomain}>None</span>
                  )}
                </div>
                <div className={styles.tableCell}>
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(site.status)}`}>
                    {site.status}
                  </span>
                </div>
                <div className={styles.tableCell}>
                  {formatDate(site.created_at)}
                </div>
                <div className={styles.tableCell}>
                  <div className={styles.actionButtons}>
                    <a
                      href={`https://${site.subdomain}.onlineartfestival.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.viewButton}
                    >
                      View Site
                    </a>
                    {site.custom_domain && (
                      <a
                        href={`https://${site.custom_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.viewButton}
                      >
                        View Domain
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.sitesStats}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{sites.length}</span>
            <span className={styles.statLabel}>Total Sites</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {sites.filter(s => s.status === 'active').length}
            </span>
            <span className={styles.statLabel}>Active Sites</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {sites.filter(s => s.status === 'draft').length}
            </span>
            <span className={styles.statLabel}>Draft Sites</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {sites.filter(s => s.custom_domain).length}
            </span>
            <span className={styles.statLabel}>Custom Domains</span>
          </div>
        </div>
      </div>
    </div>
  );
} 