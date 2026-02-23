/**
 * Social Central - Subscription Page
 * Dashboard > Marketing > Social Central > Subscription
 *
 * Uses the ChecklistController pattern (same as Websites, Shipping, Marketplace).
 * Shows: Tier selection → Terms acceptance → Card setup → Dashboard
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import ChecklistController from '../../../../components/subscriptions/ChecklistController';
import { getSocialSubscriptionConfig } from '../../../../modules/marketing/components/socialSubscriptionConfig';
import { getCurrentUser } from '../../../../lib/users/api';

/**
 * Dashboard component shown after all subscription checks pass.
 * Displays current subscription info, limits, and feature flags.
 */
function SocialSubscriptionDashboard({ subscriptionData, userData }) {
  const router = useRouter();
  const sub = subscriptionData?.subscription || {};
  const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin';

  return (
    <div>
      {/* Current plan banner */}
      <div style={{
        padding: '20px 24px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f7ff 100%)',
        border: '1px solid #bee5eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        marginBottom: '24px',
      }}>
        <div>
          <span style={{ fontSize: '13px', color: '#0c5460' }}>Current Plan</span>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>
            {sub.tier || 'Free'}
            {isAdmin && (
              <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: '#28a745', color: '#fff' }}>
                Admin
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-color)' }}>
            {sub.tierPrice > 0 ? `$${sub.tierPrice}/mo` : 'Free'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Status: <strong style={{ color: sub.status === 'active' ? '#28a745' : '#fd7e14' }}>{sub.status}</strong>
          </div>
        </div>
      </div>

      {/* Subscription details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="section-box" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fa fa-check-circle" style={{ color: '#28a745', fontSize: '20px' }}></i>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>Terms Accepted</div>
            <div style={{ fontSize: '11px', color: '#888' }}>{sub.termsAccepted ? 'Yes' : 'No'}</div>
          </div>
        </div>
        <div className="section-box" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fa fa-credit-card" style={{ color: '#0d6efd', fontSize: '20px' }}></i>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>Card on File</div>
            <div style={{ fontSize: '11px', color: '#888' }}>{sub.cardLast4 ? `•••• ${sub.cardLast4}` : 'None'}</div>
          </div>
        </div>
      </div>

      {/* Navigation to Social Central */}
      <div className="section-box" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Your subscription is active. Head to Social Central to start creating.
        </p>
        <button
          onClick={() => router.push('/dashboard/marketing/social-central')}
          style={{
            padding: '12px 24px', borderRadius: '8px', border: 'none',
            background: 'var(--primary-color)', color: '#fff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <i className="fa fa-rocket" style={{ marginRight: '8px' }}></i>
          Go to Social Central
        </button>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Frequently Asked Questions</h3>
        {[
          { q: 'Can I change plans anytime?', a: 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your billing period.' },
          { q: 'What happens if I hit a limit?', a: 'You\'ll be prompted to upgrade. Existing scheduled posts remain unaffected.' },
          { q: 'Does the AI use my data?', a: 'Leo and Claude use your brand data solely to generate personalized content. Your data is never shared.' },
          { q: 'Can I cancel?', a: 'Cancel anytime. You\'ll retain access until the end of your billing period, then revert to Free.' },
        ].map((faq, i) => (
          <div key={i} style={{ marginBottom: i < 3 ? '12px' : 0 }}>
            <strong style={{ fontSize: '13px', color: '#333' }}>{faq.q}</strong>
            <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0 0', lineHeight: '1.5' }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SocialSubscriptionPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setUserData(user);
    } catch { router.push('/login?redirect=/dashboard/marketing/social-central/subscription'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Subscription | Social Central | Brakebee</title></Head>
        <div className="loading-state"><div className="spinner"></div><span>Loading...</span></div>
      </DashboardShell>
    );
  }
  if (!userData) return null;

  const config = getSocialSubscriptionConfig(SocialSubscriptionDashboard);

  return (
    <>
      <Head><title>Subscription | Social Central | Brakebee</title></Head>
      <DashboardShell userData={userData}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => router.push('/dashboard/marketing/social-central')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6c757d' }}
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px' }}>Social Central Plans</h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#888' }}>Choose the plan that fits your marketing needs</p>
          </div>
        </div>

        <ChecklistController
          subscriptionType="social"
          userData={userData}
          config={config}
        />
      </DashboardShell>
    </>
  );
}
