/**
 * SOP Users Admin Page
 * Manage enrolled SOP users
 */

import Head from 'next/head';
import Link from 'next/link';
import { SOPLayout, SOPUsersAdmin, useSOP } from '../../modules/sop';

function UsersPageContent() {
  const { isTop, isLoading } = useSOP();

  if (isLoading) {
    return (
      <div className="sop-loading">
        <i className="fas fa-spinner fa-spin"></i>
        Loading...
      </div>
    );
  }

  if (!isTop) {
    return (
      <div className="sop-access-denied">
        <i className="fas fa-lock"></i>
        <h2>Access Denied</h2>
        <p>You need admin access to manage SOP users.</p>
        <Link href="/sop" className="btn btn-outline">
          Back to SOPs
        </Link>
      </div>
    );
  }

  return <SOPUsersAdmin />;
}

export default function SOPUsersPage() {
  return (
    <>
      <Head>
        <title>Manage Users | SOP Center</title>
      </Head>
      <SOPLayout>
        <div className="sop-page-header">
          <Link href="/sop" className="btn btn-outline btn-sm">
            <i className="fas fa-arrow-left"></i>
            Back to SOPs
          </Link>
        </div>
        <UsersPageContent />
      </SOPLayout>
    </>
  );
}
