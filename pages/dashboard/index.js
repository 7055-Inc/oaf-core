'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { authApiRequest } from '../../lib/apiUtils';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardFooter from '../../components/dashboard/DashboardFooter';



import ManageEvents from '../../components/dashboard/admin/components/ManageEvents';




// import SitesManagement from '../../components/SitesManagement'; // REMOVED - functionality moved to subscription dashboard


import ManageCommissions from '../../components/dashboard/admin/components/ManageCommissions';
import ManageUsers from '../../components/dashboard/admin/components/ManageUsers';
import ManagePermissions from '../../components/dashboard/admin/components/ManagePermissions';
import ManageAnnouncements from '../../components/dashboard/manage-system/components/ManageAnnouncements';
import ManageHeroSettings from '../../components/dashboard/manage-system/components/ManageHeroSettings';
import ManageEmailCore from '../../components/dashboard/manage-system/components/ManageEmailCore';
import ManageTermsCore from '../../components/dashboard/manage-system/components/ManageTermsCore';
import ManageCategories from '../../components/dashboard/manage-system/components/ManageCategories';
import WalmartFeedManagement from '../../components/dashboard/manage-system/components/WalmartFeedManagement';
import ManageCustomPolicies from '../../components/dashboard/manage-system/components/ManageCustomPolicies';
import AddPromoter from '../../components/dashboard/manage-system/components/AddPromoter';
import UnclaimedEvents from '../../components/dashboard/manage-system/components/UnclaimedEvents';
import DashboardGrid from '../../components/dashboard/DashboardGrid';
import OnboardingBanner from '../../components/dashboard/widgets/OnboardingWidget';
import { getAuthToken, authenticatedApiRequest } from '../../lib/csrf';
import styles from './Dashboard.module.css';
import '../../components/dashboard/SlideIn.module.css';


import MyAccountMenu from '../../components/dashboard/my-account/MyAccountMenu';
import EditProfile from '../../components/dashboard/my-account/components/EditProfile';
import ViewProfile from '../../components/dashboard/my-account/components/ViewProfile';
import MyOrders from '../../components/dashboard/my-account/components/MyOrders';
import EmailPreferences from '../../components/dashboard/my-account/components/EmailPreferences';
import PaymentSettings from '../../components/dashboard/my-account/components/PaymentSettings';
import ShippingSettings from '../../components/dashboard/my-account/components/ShippingSettings';
import ManageMyStoreMenu from '../../components/dashboard/manage-my-store/ManageMyStoreMenu';
import MyEventsMenu from '../../components/dashboard/my-events/MyEventsMenu';
import MyApplications from '../../components/dashboard/my-events/components/MyApplications';
import FindNew from '../../components/dashboard/my-events/components/FindNew';
import MyCalendar from '../../components/dashboard/my-events/components/MyCalendar';
import EventsIOwn from '../../components/dashboard/my-events/components/EventsIOwn';
import AddNew from '../../components/dashboard/my-events/components/AddNew';
import ApplicationsReceived from '../../components/dashboard/my-events/components/ApplicationsReceived';
import MyProducts from '../../components/dashboard/manage-my-store/components/MyProducts';
import AddProduct from '../../components/dashboard/manage-my-store/components/AddProduct';
import MyPolicies from '../../components/dashboard/manage-my-store/components/MyPolicies';
import ManageInventory from '../../components/dashboard/manage-my-store/components/ManageInventory';
import InventoryLog from '../../components/dashboard/manage-my-store/components/InventoryLog';
import ManageOrders from '../../components/dashboard/manage-my-store/components/ManageOrders';
import TikTokConnector from '../../components/dashboard/manage-my-store/components/TikTokConnector';
import WalmartConnector from '../../components/dashboard/manage-my-store/components/WalmartConnector';
import ManagePromotions from '../../components/dashboard/manage-my-store/components/ManagePromotions';
import MyFinancesMenu from '../../components/dashboard/my-finances/MyFinancesMenu';
import TransactionHistory from '../../components/dashboard/my-finances/components/TransactionHistory';
import PayoutsEarnings from '../../components/dashboard/my-finances/components/PayoutsEarnings';
import MySubscriptionsMenu from '../../components/dashboard/my-subscriptions/MySubscriptionsMenu';
import ManageSubscriptions from '../../components/dashboard/my-subscriptions/components/ManageSubscriptions';
import MarketplaceSubscriptions from '../../components/dashboard/my-subscriptions/components/MarketplaceSubscriptions'; // OLD
import MarketplaceSellerSubscription from '../../components/dashboard/my-subscriptions/components/MarketplaceSellerSubscription'; // NEW
import VerifiedSubscriptions from '../../components/dashboard/my-subscriptions/components/VerifiedSubscriptions'; // OLD
import VerifiedArtistSubscription from '../../components/dashboard/my-subscriptions/components/VerifiedArtistSubscription'; // NEW
import WebsitesSubscription from '../../components/dashboard/my-subscriptions/components/WebsitesSubscription';
import ShippingLabelsSubscription from '../../components/dashboard/my-subscriptions/components/ShippingLabelsSubscription';
import AdminMenu from '../../components/dashboard/admin/AdminMenu';
import ManageSystemMenu from '../../components/dashboard/manage-system/ManageSystemMenu';
import DevelopersMenu from '../../components/dashboard/developers/DevelopersMenu';
import APIKeys from '../../components/dashboard/developers/components/APIKeys';
import MyArticles from '../../components/dashboard/manage-my-store/components/MyArticles';
import ManageArticles from '../../components/dashboard/admin/components/ManageArticles';
import MarketplaceProducts from '../../components/dashboard/admin/components/MarketplaceProducts';
import MarketplaceApplications from '../../components/dashboard/admin/components/MarketplaceApplications';
import VerifiedApplications from '../../components/dashboard/admin/components/VerifiedApplications';
import WholesaleApplications from '../../components/dashboard/admin/components/WholesaleApplications';
import AdminReturns from '../../components/dashboard/admin/components/AdminReturns';
import AdminPromotions from '../../components/dashboard/admin/components/AdminPromotions';
import AdminEventReviews from '../../components/dashboard/admin/AdminEventReviews';
import MaintenanceControl from '../../components/dashboard/admin/components/MaintenanceControl';




export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard-widgets');
  const [collapsedSections, setCollapsedSections] = useState({ 
    account: true, 
    'my-account': true,
    'manage-my-store': true,
    'my-events': true,
    'my-finances': true,
    'my-subscriptions': true,
    admin: true,
    developers: true,
    'manage-system': true,
    finance: true 
  }); // Default sections to closed
  const [slideInContent, setSlideInContent] = useState(null); // Track slide-in overlay content
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
        
        authApiRequest('users/me', {
          method: 'GET',
          headers: {
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

  if (!isLoggedIn) {
    return null;
  }

  if (error) {
    return (
      <div>
        <DashboardHeader />
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
        <DashboardHeader />
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



  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard-widgets':
        return (
          <div className={styles.contentSection}>
            <OnboardingBanner userData={userData} openSlideIn={openSlideIn} />
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
    if (slideInContent.type === 'edit-profile') {
      return (
        <EditProfile
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'view-profile') {
      return (
        <ViewProfile
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'my-orders') {
      return (
        <MyOrders
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'email-settings') {
      return (
        <EmailPreferences
          userId={userData.id}
        />
      );
    }
    
    if (slideInContent.type === 'payment-settings') {
      return (
        <PaymentSettings
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'shipping-settings') {
      return (
        <ShippingSettings
          userData={userData}
        />
      );
    }
    
    // Handle Manage My Store slide-ins
    if (slideInContent.type === 'my-products') {
      return (
        <MyProducts
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'add-product') {
      return (
        <AddProduct
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'my-policies') {
      return (
        <MyPolicies
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-inventory') {
      return (
        <ManageInventory
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'inventory-log') {
      return (
        <InventoryLog
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-orders') {
      return (
        <ManageOrders
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'tiktok-connector') {
      return (
        <TikTokConnector
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'walmart-connector') {
      return (
        <WalmartConnector
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'transaction-history') {
      return (
        <TransactionHistory
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'payouts-earnings') {
      return (
        <PayoutsEarnings
          userData={userData}
        />
      );
    }
    
    // Handle My Subscriptions slide-ins
    if (slideInContent.type === 'manage-subscriptions') {
      return (
        <ManageSubscriptions
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'marketplace-subscriptions') {
      return (
        <MarketplaceSellerSubscription
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'verified-subscriptions') {
      return (
        <VerifiedArtistSubscription
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'website-subscriptions') {
      return (
        <WebsitesSubscription
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
      return (
        <MarketplaceProducts
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'marketplace-applications') {
      return (
        <MarketplaceApplications
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'verified-applications') {
      return (
        <VerifiedApplications
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'wholesale-applications') {
      return (
        <WholesaleApplications
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'admin-returns') {
      return (
        <AdminReturns
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-commissions') {
      return (
        <ManageCommissions
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-users') {
      return (
        <ManageUsers
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-permissions') {
      return (
        <ManagePermissions
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-events') {
      return (
        <ManageEvents
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'add-new') {
      return (
        <AddNew
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'my-applications') {
      return (
        <MyApplications
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'find-new') {
      return (
        <FindNew
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'my-calendar') {
      return (
        <MyCalendar
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'events-i-own') {
      return (
        <EventsIOwn
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'applications-received') {
      return (
        <ApplicationsReceived
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'api-keys') {
      return (
        <APIKeys
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'my-articles') {
      return (
        <MyArticles
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-promotions') {
      return (
        <ManagePromotions
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-articles') {
      return (
        <ManageArticles
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-announcements') {
      return (
        <ManageAnnouncements
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-hero-settings') {
      return (
        <ManageHeroSettings
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-email-core') {
      return (
        <ManageEmailCore
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-terms-core') {
      return (
        <ManageTermsCore
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-categories') {
      return (
        <ManageCategories
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'walmart-feed') {
      return (
        <WalmartFeedManagement
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'admin-promotions') {
      return (
        <AdminPromotions
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'event-reviews') {
      return (
        <AdminEventReviews
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'maintenance-control') {
      return (
        <MaintenanceControl
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'manage-custom-policies') {
      return (
        <ManageCustomPolicies
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'add-promoter') {
      return (
        <AddPromoter
          userData={userData}
        />
      );
    }
    
    if (slideInContent.type === 'unclaimed-events') {
      return (
        <UnclaimedEvents
          userData={userData}
        />
      );
    }

    // Handle other slide-in types here (for future menu sections)
    return null;
  };

  return (
    <>
      <Head>
        <script src="https://js.stripe.com/v3/" async></script>
      </Head>
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
        <DashboardHeader />
      )}

      <div className={styles.mainContent}>
        {/* Left Sidebar */}
        <div className={styles.sidebar}>
          {/* My Account Section */}
          {userData && (
            <MyAccountMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}



          {/* NEW Manage My Store Section - Skeleton for migration */}
          {userData && (
            <ManageMyStoreMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}

          {/* NEW My Events Section */}
          {userData && (
            <MyEventsMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}

          {/* NEW My Finances Section - Clean architecture */}
          {userData && (
            <MyFinancesMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}

          {/* NEW My Subscriptions Section - Clean architecture */}
          {userData && (
            <MySubscriptionsMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}

          {/* Developers Section - Clean architecture */}
          {userData && (
            <DevelopersMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}

          {/* Admin Section - Clean architecture */}
          {userData && (
            <AdminMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}

          {/* Manage System Section - Clean architecture */}
          {userData && (
            <ManageSystemMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )}


          {/* Service Management Section - Admin only */}
          {/* {userData && (
            <ServiceManagementMenu
              userData={userData}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              openSlideIn={openSlideIn}
            />
          )} */}

















        </div>

        {/* Right Content Area */}
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
    </div>
    <DashboardFooter />
    </>
  );
} 




// REMOVED: ApplicationManagementSection, ApplicationCard, BulkAcceptanceInterface, and PaymentDashboard functions - migrated to ApplicationsReceived component
