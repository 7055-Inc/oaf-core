/**
 * Social Central - Hub Page
 * Dashboard > Marketing > Social Central
 * 
 * The main hub for AI-powered social media marketing.
 * Shows quick status of connections and links to sub-sections.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../lib/users/api';
import { fetchConnections, PLATFORMS } from '../../../../lib/social-central/api';

export default function SocialCentralPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userData) loadConnections();
  }, [userData]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      const hasPermission = data?.permissions?.includes('leo_social');
      if (!hasPermission) {
        router.push('/dashboard/marketing');
        return;
      }
      setUserData(data);
    } catch (err) {
      console.error('Error loading user:', err);
      router.push('/login?redirect=/dashboard/marketing/social-central');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await fetchConnections();
      if (data.success) {
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error('Error loading connections:', err);
    }
  };

  const activeConnections = connections.filter(c => c.status === 'active');

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Social Central | Dashboard | Brakebee</title></Head>
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (!userData) return null;

  return (
    <>
      <Head><title>Social Central | Dashboard | Brakebee</title></Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Social Central</h1>
          <p className="page-subtitle">Your AI-powered social media marketing hub</p>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
          <div className="section-box" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              {activeConnections.length}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Connected Platforms</div>
          </div>
          <div className="section-box" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--secondary-color)' }}>
              {Object.keys(PLATFORMS).length - activeConnections.length}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Available to Connect</div>
          </div>
          <div className="section-box" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>0</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Scheduled Posts</div>
          </div>
          <div className="section-box" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>0</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Posts This Month</div>
          </div>
        </div>

        {/* Hub Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Connections Card */}
          <div
            className="section-box"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onClick={() => router.push('/dashboard/marketing/social-central/connections')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa fa-plug" style={{ color: 'white', fontSize: '18px' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Connections</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>{activeConnections.length} active</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
              Connect and manage your social media accounts — Facebook, Instagram, X, TikTok, and Pinterest.
            </p>
          </div>

          {/* Media Library Card */}
          <div
            className="section-box"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onClick={() => router.push('/dashboard/marketing/social-central/library')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa fa-photo-video" style={{ color: 'white', fontSize: '18px' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Media Library</h3>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
              Upload and organize images, videos, and documents for your social media campaigns.
            </p>
          </div>

          {/* Post Composer Card */}
          <div
            className="section-box"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onClick={() => router.push('/dashboard/marketing/social-central/post')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa fa-pencil" style={{ color: 'white', fontSize: '18px' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Build a Post</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>AI-assisted</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
              Create, preview, and schedule a single post with AI-powered captions, hashtags, and optimal timing.
            </p>
          </div>

          {/* Campaigns Card */}
          <div
            className="section-box"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onClick={() => router.push('/dashboard/marketing/social-central/campaigns/new')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa fa-calendar" style={{ color: 'white', fontSize: '18px' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Campaigns</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>AI-powered</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
              Create AI-generated campaign plans. Fill in a brief and Claude + Leo generate personalized post concepts.
            </p>
          </div>

          {/* Brand Voice Card */}
          <div
            className="section-box"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onClick={() => router.push('/dashboard/marketing/social-central/brand-voice')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa fa-microphone" style={{ color: 'white', fontSize: '18px' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Brand Voice</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>AI personality</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
              Configure your brand's tone, writing style, and personality. The AI uses this to write authentic, on-brand content.
            </p>
          </div>

          {/* Subscription Card */}
          <div
            className="section-box"
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onClick={() => router.push('/dashboard/marketing/social-central/subscription')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa fa-crown" style={{ color: 'white', fontSize: '18px' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Plans &amp; Billing</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>Manage tier</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
              View your subscription tier, upgrade for AI features, campaigns, and advanced scheduling.
            </p>
          </div>
        </div>

        {/* Connected Accounts Quick View */}
        {activeConnections.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Connected Accounts</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {activeConnections.map(conn => {
                const platform = PLATFORMS[conn.platform] || {};
                return (
                  <div key={conn.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '20px',
                    background: platform.colorLight || '#f0f0f0',
                    border: `1px solid ${platform.color || '#ccc'}20`,
                    fontSize: '13px', fontWeight: '500'
                  }}>
                    <i className={`fab ${platform.icon || 'fa-link'}`} style={{ color: platform.color || '#333' }}></i>
                    <span>{conn.account_name || platform.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
