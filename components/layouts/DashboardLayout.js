'use client';
import DashboardHeader from '../dashboard/DashboardHeader';
import DashboardFooter from '../dashboard/DashboardFooter';

/**
 * DashboardLayout - Persistent layout for dashboard pages
 * 
 * This layout wraps all /dashboard/* pages. The DashboardHeader and 
 * DashboardFooter stay mounted during client-side navigation within
 * the dashboard, only the children swap out.
 * 
 * Note: The sidebar is currently handled within individual dashboard pages.
 * A future enhancement could move the sidebar into this layout for even
 * better persistence, but that requires more refactoring.
 */
export default function DashboardLayout({ children }) {
  return (
    <>
      <DashboardHeader />
      <main>{children}</main>
      <DashboardFooter />
    </>
  );
}

