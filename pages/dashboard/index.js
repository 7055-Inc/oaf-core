'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { authApiRequest } from '../../lib/apiUtils';
import { getCurrentUser } from '../../lib/users/api';
import DashboardShell from '../../modules/dashboard/components/layout/DashboardShell';







// import SitesManagement from '../../components/SitesManagement'; // REMOVED - functionality moved to subscription dashboard


// CommissionManagement migrated to /dashboard/users/commissions (modules/users/CommissionManagement)
// ManageUsers migrated to /dashboard/users/manage (modules/users/UserManagement)
// ManagePermissions migrated to /dashboard/users/manage (permissions tab in UserManagement)
// ManageAnnouncements and ManageHeroSettings migrated to /dashboard/system/homepage (modules/system)
// ManageEmailCore migrated to /dashboard/system/email (modules/system/email)
// ManageTermsCore migrated to /dashboard/system/terms (modules/system/terms)
// ManageCustomPolicies migrated to /dashboard/system/terms (Policies tab)
// UnclaimedEvents migrated to /dashboard/events/unclaimed (modules/events)
// ManageCategories migrated to /dashboard/catalog/categories (modules/catalog)
import { AddPromoter } from '../../modules/marketing';
import DashboardGrid from '../../components/dashboard/DashboardGrid';
import OnboardingBanner from '../../components/dashboard/widgets/OnboardingWidget';
import { MagazineLink } from '../../modules/communications/components';
import { getAuthToken, authenticatedApiRequest } from '../../lib/csrf';
import styles from './Dashboard.module.css';
import '../../components/dashboard/SlideIn.module.css';


// MyAccountMenu removed - migrated to Communications module (/dashboard/communications/tickets)
// MyOrders migrated to /dashboard/commerce/orders
// Manage My Store section removed; all items moved to new menu (Catalog, Business Center, Communications)
import { MyApplications } from '../../modules/events';
// ManageJuryPackets migrated to /dashboard/events/jury-packets
// FindNew migrated to /dashboard/events/find
// MyCalendar migrated to /dashboard/events/mine (My Events = calendar: applied + custom)
// EventsIOwn migrated to /dashboard/events/own
// Applications Received removed; use Business Center > My Applicants /dashboard/commerce/applicants
// Migrated to new modular system: MyProducts, AddProduct, ManageInventory, InventoryLog, CatalogManager, ManageOrders
// Now available at /dashboard/catalog/* and /dashboard/commerce/*
// ManagePromotions migrated to Business Center > Promotions (/dashboard/commerce/promotions)
// Migrated to new modular system: MyFinancesMenu, TransactionHistory, PayoutsEarnings
// Now available at /dashboard/commerce/finances/*
// Migrated: MySubscriptionsMenu, ManageSubscriptions → /dashboard/subscriptions
// Individual subscription flows still use slide-ins until full page migration
import { MarketplaceSubscription } from '../../modules/commerce/components/marketplace';
import { VerifiedSubscription } from '../../modules/users/components/verified';
import { ShippingLabelsSubscription } from '../../modules/commerce/components/shipping';
// AdminMenu removed - All items migrated to new module pages
// ManageSystemMenu removed - Categories migrated to /dashboard/catalog/categories
// MarketplaceProducts migrated to /dashboard/system/curate (modules/catalog/ProductCuration)
// MarketplaceApplications migrated to /dashboard/commerce/marketplace-applications (modules/commerce/AdminMarketplace)
// VerifiedApplications migrated to /dashboard/commerce/marketplace-applications?type=verified (same component, different tab)
// WholesaleApplications migrated to /dashboard/commerce/marketplace-applications?type=wholesale (same component, Wholesale tab)
// AdminReturns migrated to /dashboard/commerce/returns-admin (modules/commerce/AdminReturns)
// ApplicationRefunds migrated to /dashboard/service/refunds (modules/finances/AdminRefunds)
// SupportTickets migrated to /dashboard/communications/admin
// AdminPromotions migrated to /dashboard/marketing/admin-promotions (modules/marketing/AdminPromotions)
// MaintenanceControl removed - not needed for staging workflow




export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard-widgets');
  const [collapsedSections, setCollapsedSections] = useState({ 
    account: true, 
    'my-account': true,
    'my-events': true,
    'my-finances': true,
    'my-subscriptions': true,
    admin: true,
    'manage-system': true,
    finance: true 
  }); // Default sections to closed
  const [slideInContent, setSlideInContent] = useState(null); // Track slide-in overlay content
  const [adminNotifications, setAdminNotifications] = useState({});
  const [userNotifications, setUserNotifications] = useState({});
  const router = useRouter();

  // MOVED: All hooks must be at the top before any early returns
  const openSlideIn = useCallback((contentType, props = {}) => {
    setSlideInContent({ type: contentType, title: props.title, props });
  }, []);

  const closeSlideIn = () => {
    setSlideInContent(null);
  };

  // MOVED: This useEffect is now at the top of the component

  useEffect(() => {
    // Check if middleware ran (prevents client-side navigation from bypassing checklist)
    const middlewareChecked = document.cookie.includes('middleware_checked');
    if (!middlewareChecked) {
      // Force hard reload to trigger middleware checklist
      window.location.reload();
      return;
    }
    
    const token = getAuthToken();
    if (!token) {
      router.push('/');
    } else {
      setIsLoggedIn(true);
      // Fetch user data and extract permissions from JWT
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        getCurrentUser()
          .then(data => {
            const userData = {
              ...data,
              permissions: payload.permissions || []
            };
            setUserData(userData);
          })
          .catch(err => {
            setError(err.message);
          });
      } catch (jwtError) {
        setError('Invalid authentication token');
      }
    }
    
    // Listen for auth logout events
    const handleAuthLogout = () => {
      setIsLoggedIn(false);
      setUserData(null);
      router.push('/');
    };
    
    // Listen for widget slide-in events
    const handleWidgetSlideIn = (event) => {
      const { type, title } = event.detail;
      openSlideIn(type, { title });
    };
    
    window.addEventListener('auth-logout', handleAuthLogout);
    window.addEventListener('dashboard-open-slide-in', handleWidgetSlideIn);
    
    return () => {
      window.removeEventListener('auth-logout', handleAuthLogout);
      window.removeEventListener('dashboard-open-slide-in', handleWidgetSlideIn);
    };
  }, [openSlideIn]);

  // Fetch admin notifications when userData is available
  useEffect(() => {
    if (!userData) return;
    
    const isAdmin = userData.user_type === 'admin';
    const hasManageSystem = userData.permissions?.includes('manage_system');
    
    if (!isAdmin && !hasManageSystem) return;
    
    const fetchAdminNotifications = async () => {
      try {
        const response = await authApiRequest('/api/v2/system/admin/notifications', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const notifs = data.data?.notifications || data.notifications;
          if (notifs) {
            setAdminNotifications(notifs);
          }
        }
      } catch (err) {
        // Silently fail - notifications are non-critical
      }
    };
    
    fetchAdminNotifications();
    
    // Refresh notifications every 2 minutes
    const interval = setInterval(fetchAdminNotifications, 120000);
    return () => clearInterval(interval);
  }, [userData]);

  // Fetch user ticket notifications when userData is available
  useEffect(() => {
    if (!userData) return;
    
    const fetchUserNotifications = async () => {
      try {
        const response = await authApiRequest('api/v2/system/tickets/my/notifications', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (data.success && data.data?.notifications) {
          setUserNotifications(data.data.notifications);
        }
      } catch (err) {
        // Silently fail - notifications are non-critical
      }
    };
    
    fetchUserNotifications();
    
    // Refresh notifications every 2 minutes
    const interval = setInterval(fetchUserNotifications, 120000);
    return () => clearInterval(interval);
  }, [userData]);

  // Handle URL query parameters for deep linking (e.g., edit event from public page)
  useEffect(() => {
    if (typeof window === 'undefined' || !userData) return;
    
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const eventId = params.get('eventId');
    
    if (action === 'edit' && eventId) {
      openSlideIn('add-new', { title: 'Edit Event', eventId: parseInt(eventId) });
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [userData, openSlideIn]);

  if (!isLoggedIn) {
    return null;
  }

  if (error) {
    return (
      <DashboardShell>
        <div className={styles.container}>
          <h1>Error</h1>
          <p>{error}</p>
        </div>
      </DashboardShell>
    );
  }

  if (!userData) {
    return (
      <DashboardShell>
        <div className={styles.container}>
          <h1>Loading...</h1>
        </div>
      </DashboardShell>
    );
  }

  const isAdmin = userData.user_type === 'admin';
  const isPromoter = userData.user_type === 'promoter';
  const hasVendorPermission = userData.permissions?.includes('vendor');
  const canManageProducts = isAdmin || hasVendorPermission;
  const canManageEvents = isAdmin || isPromoter;
  


  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard-widgets':
        return (
          <div className={styles.contentSection}>
            {/* Top Row: Magazine Link + Onboarding Banner */}
            <div className={styles.topBannerRow}>
              <div className={styles.magazineLinkWrapper}>
                <MagazineLink userData={userData} />
              </div>
              <div className={styles.onboardingWrapper}>
                <OnboardingBanner userData={userData} openSlideIn={openSlideIn} />
              </div>
            </div>
            <DashboardGrid />
          </div>
        );
      case 'profile':
        return (
          <div className={styles.contentSection}>
            <h2>Profile Management</h2>
            <p>Manage your account settings and profile information.</p>
          </div>
        );






      case 'email-preferences':
        return (
          <div className={styles.contentSection}>
            <EmailPreferences userId={userData.id} />
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

  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // MOVED: This useEffect is now at the top of the component

  const renderSlideInContent = () => {
    if (!slideInContent || !userData) return null;









    // Handle My Account slide-ins
    // Note: edit-profile, view-profile, email-settings, payment-settings, shipping-settings
    // have been migrated to page-based navigation at /dashboard/users/*
    
    if (slideInContent.type === 'my-orders') {
      window.location.href = '/dashboard/commerce/orders';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    // Migrated slide-ins - redirect to new pages
    if (slideInContent.type === 'my-products') {
      window.location.href = '/dashboard/catalog/products';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'catalog-manager') {
      window.location.href = '/dashboard/catalog/import-export';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'add-product') {
      window.location.href = '/dashboard/catalog/products/new';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'manage-inventory') {
      window.location.href = '/dashboard/catalog/inventory';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'inventory-log') {
      window.location.href = '/dashboard/catalog/inventory/log';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'manage-orders') {
      window.location.href = '/dashboard/commerce/sales';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'tiktok-connector') {
      window.location.href = '/dashboard/catalog/addons/tiktok';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'walmart-connector') {
      window.location.href = '/dashboard/catalog/addons/walmart';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'transaction-history') {
      window.location.href = '/dashboard/commerce/finances/transactions';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'payouts-earnings') {
      window.location.href = '/dashboard/commerce/finances';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    // Handle My Subscriptions slide-ins
    // manage-subscriptions migrated to /dashboard/subscriptions
    if (slideInContent.type === 'manage-subscriptions') {
      window.location.href = '/dashboard/subscriptions';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'marketplace-subscriptions') {
      return (
        <MarketplaceSubscription
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'verified-subscriptions') {
      return (
        <VerifiedSubscription
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'shipping-labels-subscriptions') {
      return (
        <ShippingLabelsSubscription
          userData={userData}
        />
      );
    }

    // Handle Admin slide-ins
    if (slideInContent.type === 'marketplace-products') {
      // Redirect to new System > Curate page
      window.location.href = '/dashboard/system/curate';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'marketplace-applications') {
      // Redirect to new marketplace applications page
      window.location.href = '/dashboard/commerce/marketplace-applications';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'verified-applications') {
      // Redirect to marketplace applications (has Verified tab)
      window.location.href = '/dashboard/commerce/marketplace-applications?type=verified';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'wholesale-applications') {
      // Migrated to /dashboard/commerce/marketplace-applications?type=wholesale
      window.location.href = '/dashboard/commerce/marketplace-applications?type=wholesale';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'support-tickets') {
      window.location.href = '/dashboard/communications/admin';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'admin-refunds') {
      // Redirect to new refunds page
      router.push('/dashboard/service/refunds');
      return null;
    }
    
    if (slideInContent.type === 'admin-returns') {
      // Redirect to new returns admin page
      router.push('/dashboard/commerce/returns-admin');
      return null;
    }
    
    if (slideInContent.type === 'manage-commissions') {
      // Migrated to /dashboard/users/commissions
      window.location.href = '/dashboard/users/commissions';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'manage-users') {
      // Redirect to new user management page
      window.location.href = '/dashboard/users/manage';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'manage-permissions') {
      // Redirect to user management page (permissions are managed there)
      window.location.href = '/dashboard/users/manage';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'my-applications') {
      return (
        <MyApplications
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-jury-packets') {
      window.location.href = '/dashboard/events/jury-packets';
      return null;
    }
    
    if (slideInContent.type === 'find-new') {
      window.location.href = '/dashboard/events/find';
      return null;
    }
    
    if (slideInContent.type === 'my-calendar') {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/events/mine';
      }
      return null;
    }
    
    if (slideInContent.type === 'events-i-own') {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/events/own';
      }
      return null;
    }
    
    if (slideInContent.type === 'applications-received') {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/commerce/applicants';
      }
      return null;
    }
    
    if (slideInContent.type === 'my-articles') {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/communications/articles';
      }
      return null;
    }
    
    if (slideInContent.type === 'manage-promotions') {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/commerce/promotions';
      }
      return null;
    }
    
    if (slideInContent.type === 'manage-articles') {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/communications/articles';
      }
      return null;
    }
    
    if (slideInContent.type === 'manage-announcements' || slideInContent.type === 'manage-hero-settings') {
      // Migrated to /dashboard/system/homepage (modules/system)
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/system/homepage';
      }
      return null;
    }
    
    if (slideInContent.type === 'manage-email-core') {
      // Redirect to new email management page
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/system/email';
      }
      return null;
    }
    
    if (slideInContent.type === 'manage-terms-core') {
      // Redirect to new terms management page
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/system/terms';
      }
      return null;
    }
    
    if (slideInContent.type === 'manage-categories') {
      // Redirect to new category management page
      window.location.href = '/dashboard/catalog/categories';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'walmart-feed') {
      window.location.href = '/dashboard/catalog/addons/walmart-admin';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    if (slideInContent.type === 'admin-promotions') {
      // Migrated to /dashboard/marketing/admin-promotions
      window.location.href = '/dashboard/marketing/admin-promotions';
      return <div className="loading-state"><div className="spinner"></div><p>Redirecting...</p></div>;
    }
    
    // maintenance-control removed - not needed for staging workflow
    
    if (slideInContent.type === 'manage-custom-policies') {
      // Redirect to new terms/policies page
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/system/terms';
      }
      return null;
    }
    
    if (slideInContent.type === 'unclaimed-events') {
      // Redirect to new events page
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/events/unclaimed';
      }
      return null;
    }

    // Handle other slide-in types here (for future menu sections)
    return null;
  };

  return (
    <>
      <Head>
        <script src="https://js.stripe.com/v3/" async></script>
      </Head>
      <DashboardShell userData={userData}>
        <div className={styles.dashboardContent}>
          {/* Widget Grid / Content Area */}
          <div className={styles.contentArea}>
            {renderContent()}
          </div>

          {/* Slide-In Overlay */}
          {slideInContent && (
            <div className={styles.slideInOverlay}>
              <div className={styles.slideInPanel}>
                <div className={styles.slideInContainer}>
                  <div className={styles.slideInHeader}>
                    <button className={styles.backButton} onClick={closeSlideIn}>
                      <i className="fas fa-arrow-left"></i>
                      Back to Dashboard
                    </button>
                    <h2 className={styles.slideInTitle}>{slideInContent.title || 'Slide-In Title'}</h2>
                  </div>
                  <div className={styles.slideInContent}>
                    {renderSlideInContent()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardShell>
    </>
  );
} 




// Applications Received (old) removed; My Applicants at /dashboard/commerce/applicants uses ApplicationCard, BulkAcceptanceInterface, PaymentDashboard from applications-received/

export async function getServerSideProps() {
  return { props: {} };
}
