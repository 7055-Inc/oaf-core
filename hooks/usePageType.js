import { useRouter } from 'next/router';

export const usePageType = () => {
  const router = useRouter();
  
  const isDashboardPage = router.pathname.startsWith('/dashboard');
  const isAdminPage = router.pathname.startsWith('/admin');
  const isProfilePage = router.pathname.startsWith('/profile');
  
  // Pages where we want to hide the categories menu
  const shouldHideCategories = isDashboardPage || isAdminPage;
  
  // Pages where we want to show hamburger menu instead
  const shouldShowHamburger = isDashboardPage;
  
  return {
    isDashboardPage,
    isAdminPage,
    isProfilePage,
    shouldHideCategories,
    shouldShowHamburger,
    pageType: isDashboardPage ? 'dashboard' : isAdminPage ? 'admin' : 'public'
  };
}; 