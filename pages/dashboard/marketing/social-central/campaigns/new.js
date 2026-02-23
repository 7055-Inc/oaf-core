/**
 * Social Central - Campaign Builder (New Campaign)
 * Dashboard > Marketing > Social Central > Campaigns > New
 *
 * Tiered campaign creation form:
 *   Free    — blocked (redirect to subscription)
 *   Starter — core fields: name, goal, platforms, dates, post count
 *   Pro     — + demographics, theme, message, aesthetic, budget
 *   Admin   — + sitewide analytics toggle, ad-spend advisor, CRM email toggle
 *
 * On submit:
 *   1. Creates campaign record via API
 *   2. Triggers AI campaign generation (Claude + Leo context)
 *   3. Redirects to AI Post Queue to review generated posts
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../../lib/users/api';
import {
  generateCampaign,
  fetchConnections,
  fetchAssets,
  checkAIStatus,
  PLATFORMS,
} from '../../../../../lib/social-central/api';

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------
const TIERS = {
  starter: { label: 'Starter', color: '#0d6efd', badge: 'Starter' },
  pro:     { label: 'Pro',     color: '#6f42c1', badge: 'Pro' },
  admin:   { label: 'Admin',   color: '#198754', badge: 'Admin' },
};

// Campaign goal presets
const GOAL_PRESETS = [
  { value: 'brand_awareness',    label: 'Brand Awareness',      icon: 'fa-eye' },
  { value: 'engagement',         label: 'Engagement',            icon: 'fa-heart' },
  { value: 'traffic',            label: 'Drive Traffic',          icon: 'fa-arrow-up-right-from-square' },
  { value: 'sales',              label: 'Product Sales',          icon: 'fa-shopping-cart' },
  { value: 'event_promotion',    label: 'Event Promotion',        icon: 'fa-calendar-check' },
  { value: 'follower_growth',    label: 'Follower Growth',        icon: 'fa-user-plus' },
  { value: 'custom',             label: 'Custom Goal',            icon: 'fa-bullseye' },
];

// Aesthetic style options (Pro+)
const AESTHETIC_OPTIONS = [
  'Minimal & Clean', 'Bold & Vibrant', 'Earthy & Natural', 'Dark & Moody',
  'Pastel & Soft', 'Vintage & Retro', 'Modern & Sleek', 'Whimsical & Playful',
  'Luxury & Elegant', 'Handmade & Organic',
];

// Tone options (Pro+)
const TONE_OPTIONS = [
  'Professional', 'Casual & Friendly', 'Playful & Fun', 'Inspirational',
  'Educational', 'Storytelling', 'Urgent / FOMO', 'Conversational',
];

// Audience demographic presets (Pro+)
const DEMOGRAPHIC_PRESETS = [
  'Art collectors (35-60, high income)',
  'Young creatives (18-30, social-savvy)',
  'Interior designers & decorators',
  'Gift shoppers (holiday season)',
  'Local community supporters',
  'Online art enthusiasts',
  'Other (custom)',
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [assets, setAssets] = useState([]);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Determine user tier: 'starter' | 'pro' | 'admin'
  const [userTier, setUserTier] = useState('starter');

  // ---------------------------------------------------------------------------
  // Campaign form state
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState({
    // --- Starter fields ---
    name: '',
    goal: 'brand_awareness',
    customGoal: '',
    platforms: [],
    startDate: '',
    endDate: '',
    postCount: 5,

    // --- Pro fields ---
    demographics: '',
    customDemographics: '',
    theme: '',
    overallMessage: '',
    aesthetic: '',
    tone: '',
    budgetEnabled: false,
    budgetAmount: '',
    budgetCurrency: 'USD',

    // --- Admin fields ---
    useSitewideAnalytics: false,
    useAdSpendAdvisor: false,
    connectCRM: false,
    crmEmailEnabled: false,
    connectDrip: false,
    connectCollection: false,
    adminNotes: '',
  });

  // ---------------------------------------------------------------------------
  // Load user, connections, assets, AI status
  // ---------------------------------------------------------------------------
  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (userData) {
      loadConnections();
      loadAssets();
      loadAIStatus();
    }
  }, [userData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      const hasPermission = data?.permissions?.includes('leo_social');
      if (!hasPermission) {
        router.push('/dashboard/marketing');
        return;
      }
      setUserData(data);
      if (data.user_type === 'admin') {
        setUserTier('admin');
      } else if (data.permissions?.includes('leo_social_pro')) {
        setUserTier('pro');
      } else {
        setUserTier('starter');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      router.push('/login?redirect=/dashboard/marketing/social-central/campaigns/new');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await fetchConnections();
      if (data.success) setConnections((data.connections || []).filter(c => c.status === 'active'));
    } catch (err) { console.error('Error loading connections:', err); }
  };

  const loadAssets = async () => {
    try {
      const data = await fetchAssets({ limit: 50 });
      if (data.success) setAssets(data.assets || []);
    } catch (err) { console.error('Error loading assets:', err); }
  };

  const loadAIStatus = async () => {
    try {
      const data = await checkAIStatus();
      setAiAvailable(data.available || false);
    } catch (err) { setAiAvailable(false); }
  };

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const togglePlatform = (platformId) => {
    setForm(prev => {
      const current = prev.platforms;
      return {
        ...prev,
        platforms: current.includes(platformId)
          ? current.filter(p => p !== platformId)
          : [...current, platformId],
      };
    });
  };

  const connectedPlatformIds = connections.map(c => c.platform);

  // Calculate date defaults
  useEffect(() => {
    if (!form.startDate) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const threeWeeks = new Date(today);
      threeWeeks.setDate(threeWeeks.getDate() + 21);
      updateField('startDate', nextWeek.toISOString().split('T')[0]);
      updateField('endDate', threeWeeks.toISOString().split('T')[0]);
    }
  }, []);

  const tierAtLeast = (requiredTier) => {
    const order = { starter: 1, pro: 2, admin: 3 };
    return order[userTier] >= order[requiredTier];
  };

  // ---------------------------------------------------------------------------
  // Submit — generate campaign
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!form.name.trim()) { setError('Please enter a campaign name.'); return; }
    if (form.platforms.length === 0) { setError('Select at least one platform.'); return; }
    if (!form.startDate || !form.endDate) { setError('Please set start and end dates.'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) { setError('End date must be after start date.'); return; }

    setGenerating(true);

    try {
      // Build the campaign payload
      const payload = {
        campaignName: form.name.trim(),
        campaignGoal: form.goal === 'custom' ? form.customGoal : GOAL_PRESETS.find(g => g.value === form.goal)?.label || form.goal,
        platforms: form.platforms,
        startDate: form.startDate,
        endDate: form.endDate,
        postCount: parseInt(form.postCount) || 5,
      };

      // Pro-tier extras
      if (tierAtLeast('pro')) {
        if (form.demographics) {
          payload.demographics = form.demographics === 'Other (custom)' ? form.customDemographics : form.demographics;
        }
        if (form.theme) payload.theme = form.theme;
        if (form.overallMessage) payload.overallMessage = form.overallMessage;
        if (form.aesthetic) payload.aesthetic = form.aesthetic;
        if (form.tone) payload.tone = form.tone;
        if (form.budgetEnabled && form.budgetAmount) {
          payload.budget = {
            amount: parseFloat(form.budgetAmount),
            currency: form.budgetCurrency,
          };
        }
      }

      // Admin-tier extras
      if (tierAtLeast('admin')) {
        payload.useSitewideAnalytics = form.useSitewideAnalytics;
        payload.useAdSpendAdvisor = form.useAdSpendAdvisor;
        payload.connectCRM = form.connectCRM;
        payload.crmEmailEnabled = form.crmEmailEnabled;
        payload.connectDrip = form.connectDrip;
        payload.connectCollection = form.connectCollection;
        if (form.adminNotes) payload.adminNotes = form.adminNotes;
      }

      // Call AI generation
      const result = await generateCampaign(payload);

      if (result.success) {
        setToast({ type: 'success', message: `Campaign generated! ${result.data?.posts?.length || 0} post concepts created.` });
        // Redirect to campaign review page after a short delay
        setTimeout(() => {
          if (result.data?.campaignId) {
            router.push(`/dashboard/marketing/social-central/campaigns/${result.data.campaignId}`);
          } else {
            router.push('/dashboard/marketing/social-central');
          }
        }, 1500);
      } else {
        setError(result.error || 'Campaign generation failed. Please try again.');
      }
    } catch (err) {
      console.error('Error generating campaign:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const TierBadge = ({ tier }) => {
    const t = TIERS[tier];
    if (!t) return null;
    return (
      <span style={{
        display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 7px',
        borderRadius: '8px', background: `${t.color}18`, color: t.color, marginLeft: '8px',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>{t.badge}</span>
    );
  };

  const LockedOverlay = ({ tier }) => (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', borderRadius: '2px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    }}>
      <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 600 }}>
        <i className="fa fa-lock" style={{ marginRight: '6px' }}></i>
        Upgrade to {TIERS[tier]?.label} to unlock
      </span>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>New Campaign | Social Central</title></Head>
        <div className="loading-state"><div className="spinner"></div><span>Loading...</span></div>
      </DashboardShell>
    );
  }
  if (!userData) return null;

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <>
      <Head><title>New Campaign | Social Central | Brakebee</title></Head>
      <DashboardShell userData={userData}>

        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/dashboard/marketing/social-central')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6c757d', padding: '4px' }}
              title="Back to Social Central"
            >
              <i className="fa fa-arrow-left"></i>
            </button>
            <div>
              <h1 style={{ margin: 0 }}>Create Campaign</h1>
              <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
                Fill in your campaign brief — Leo AI and Claude will generate personalized post concepts.
              </p>
            </div>
          </div>
        </div>

        {/* Tier indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px',
          padding: '10px 16px', borderRadius: '8px', background: '#f8f9fa', fontSize: '13px',
        }}>
          <span style={{ color: '#555' }}>Your tier:</span>
          <span style={{
            fontWeight: 700, color: TIERS[userTier]?.color || '#333',
            padding: '3px 10px', borderRadius: '12px',
            background: `${TIERS[userTier]?.color || '#ccc'}15`,
          }}>
            {TIERS[userTier]?.label}
          </span>
          {!aiAvailable && (
            <span style={{ color: '#dc3545', marginLeft: 'auto', fontSize: '12px' }}>
              <i className="fa fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>
              AI generation unavailable — check API key
            </span>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '6px', background: '#f8d7da', color: '#842029',
            border: '1px solid #f5c2c7', marginBottom: '20px', fontSize: '14px',
          }}>
            <i className="fa fa-exclamation-circle" style={{ marginRight: '6px' }}></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ================================================================= */}
          {/* SECTION 1: CORE FIELDS (Starter) */}
          {/* ================================================================= */}
          <div className="section-box" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', marginTop: 0, marginBottom: '18px', display: 'flex', alignItems: 'center' }}>
              <i className="fa fa-info-circle" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
              Campaign Basics
            </h2>

            {/* Campaign Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Campaign Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Spring Collection Launch"
                style={inputStyle}
                required
              />
            </div>

            {/* Campaign Goal */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Campaign Goal *</label>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '8px', marginTop: '6px',
              }}>
                {GOAL_PRESETS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => updateField('goal', g.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                      border: form.goal === g.value ? '2px solid var(--primary-color)' : '1px solid #dee2e6',
                      background: form.goal === g.value ? 'var(--primary-color)08' : '#fff',
                      fontSize: '13px', fontWeight: form.goal === g.value ? 600 : 400,
                      color: form.goal === g.value ? 'var(--primary-color)' : '#555',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <i className={`fa ${g.icon}`} style={{ width: '16px', textAlign: 'center' }}></i>
                    {g.label}
                  </button>
                ))}
              </div>
              {form.goal === 'custom' && (
                <input
                  type="text"
                  value={form.customGoal}
                  onChange={(e) => updateField('customGoal', e.target.value)}
                  placeholder="Describe your custom goal..."
                  style={{ ...inputStyle, marginTop: '8px' }}
                />
              )}
            </div>

            {/* Platforms */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Target Platforms *</label>
              {connectedPlatformIds.length === 0 && (
                <p style={{ fontSize: '12px', color: '#dc3545', margin: '4px 0 8px 0' }}>
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                  No connected accounts. <a href="/dashboard/marketing/social-central/connections" style={{ color: '#dc3545', textDecoration: 'underline' }}>Connect platforms first</a>.
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                {Object.values(PLATFORMS).map(p => {
                  const isConnected = connectedPlatformIds.includes(p.id);
                  const isSelected = form.platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => isConnected ? togglePlatform(p.id) : null}
                      disabled={!isConnected}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', borderRadius: '10px', cursor: isConnected ? 'pointer' : 'not-allowed',
                        border: isSelected ? `2px solid ${p.color}` : '1px solid #dee2e6',
                        background: isSelected ? `${p.color}10` : isConnected ? '#fff' : '#f8f9fa',
                        opacity: isConnected ? 1 : 0.5,
                        fontSize: '13px', fontWeight: isSelected ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i className={`fab ${p.icon}`} style={{ color: isSelected ? p.color : '#888', fontSize: '16px' }}></i>
                      <span style={{ color: isSelected ? p.color : '#555' }}>{p.name}</span>
                      {isSelected && <i className="fa fa-check" style={{ color: p.color, fontSize: '12px' }}></i>}
                      {!isConnected && <i className="fa fa-lock" style={{ color: '#ccc', fontSize: '11px' }}></i>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range & Post Count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Start Date *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>End Date *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Posts</label>
                <input
                  type="number"
                  min={1} max={30}
                  value={form.postCount}
                  onChange={(e) => updateField('postCount', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SECTION 2: PRO FIELDS — Creative Direction */}
          {/* ================================================================= */}
          <div className="section-box" style={{ marginBottom: '20px', position: 'relative' }}>
            {!tierAtLeast('pro') && <LockedOverlay tier="pro" />}
            <h2 style={{ fontSize: '16px', marginTop: 0, marginBottom: '18px', display: 'flex', alignItems: 'center' }}>
              <i className="fa fa-palette" style={{ marginRight: '8px', color: '#6f42c1' }}></i>
              Creative Direction
              <TierBadge tier="pro" />
            </h2>

            {/* Demographics */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Target Demographics</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {DEMOGRAPHIC_PRESETS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateField('demographics', d)}
                    style={{
                      padding: '6px 12px', borderRadius: '16px', cursor: 'pointer',
                      border: form.demographics === d ? '2px solid #6f42c1' : '1px solid #dee2e6',
                      background: form.demographics === d ? '#6f42c115' : '#fff',
                      fontSize: '12px', color: form.demographics === d ? '#6f42c1' : '#555',
                      fontWeight: form.demographics === d ? 600 : 400,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {form.demographics === 'Other (custom)' && (
                <input
                  type="text"
                  value={form.customDemographics}
                  onChange={(e) => updateField('customDemographics', e.target.value)}
                  placeholder="Describe your target audience..."
                  style={{ ...inputStyle, marginTop: '8px' }}
                />
              )}
            </div>

            {/* Theme & Overall Message */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Campaign Theme</label>
                <input
                  type="text"
                  value={form.theme}
                  onChange={(e) => updateField('theme', e.target.value)}
                  placeholder='e.g., "Colors of Spring", "Behind the Brush"'
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Overall Message</label>
                <input
                  type="text"
                  value={form.overallMessage}
                  onChange={(e) => updateField('overallMessage', e.target.value)}
                  placeholder="The key takeaway you want audiences to remember"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Aesthetic & Tone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Visual Aesthetic</label>
                <select
                  value={form.aesthetic}
                  onChange={(e) => updateField('aesthetic', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Leo will infer from your brand data</option>
                  {AESTHETIC_OPTIONS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tone of Voice</label>
                <select
                  value={form.tone}
                  onChange={(e) => updateField('tone', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Let AI choose based on your brand</option>
                  {TONE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Budget */}
            <div style={{ marginBottom: '4px' }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={form.budgetEnabled}
                  onChange={(e) => updateField('budgetEnabled', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6f42c1' }}
                />
                Include Advertising Budget
              </label>
              <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0 24px' }}>
                If enabled, Claude will recommend which posts to boost and Leo will suggest ad spend allocation.
              </p>
              {form.budgetEnabled && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginLeft: '24px' }}>
                  <div style={{ flex: 1, maxWidth: '200px' }}>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.budgetAmount}
                      onChange={(e) => updateField('budgetAmount', e.target.value)}
                      placeholder="Total budget"
                      style={inputStyle}
                    />
                  </div>
                  <select
                    value={form.budgetCurrency}
                    onChange={(e) => updateField('budgetCurrency', e.target.value)}
                    style={{ ...inputStyle, width: '90px' }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* SECTION 3: ADMIN FIELDS — Advanced Controls */}
          {/* ================================================================= */}
          <div className="section-box" style={{ marginBottom: '20px', position: 'relative' }}>
            {!tierAtLeast('admin') && <LockedOverlay tier="admin" />}
            <h2 style={{ fontSize: '16px', marginTop: 0, marginBottom: '18px', display: 'flex', alignItems: 'center' }}>
              <i className="fa fa-cogs" style={{ marginRight: '8px', color: '#198754' }}></i>
              Advanced Controls
              <TierBadge tier="admin" />
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Sitewide Analytics */}
              <div style={{ padding: '14px', borderRadius: '8px', background: '#f8f9fa' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="checkbox"
                    checked={form.useSitewideAnalytics}
                    onChange={(e) => updateField('useSitewideAnalytics', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#198754' }}
                  />
                  Sitewide Analytics
                </label>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 0 24px' }}>
                  Inject global marketplace trends, aggregate user behavior, and cross-artist performance data into the AI brief.
                </p>
              </div>

              {/* Ad Spend Advisor */}
              <div style={{ padding: '14px', borderRadius: '8px', background: '#f8f9fa' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="checkbox"
                    checked={form.useAdSpendAdvisor}
                    onChange={(e) => updateField('useAdSpendAdvisor', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#198754' }}
                  />
                  Ad Spend Advisor
                </label>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 0 24px' }}>
                  Leo compares Claude&apos;s boost recommendations with in-house performance data and suggests optimal ad spend per creative.
                </p>
              </div>

              {/* CRM Email Integration */}
              <div style={{ padding: '14px', borderRadius: '8px', background: '#f8f9fa' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="checkbox"
                    checked={form.connectCRM}
                    onChange={(e) => {
                      updateField('connectCRM', e.target.checked);
                      if (!e.target.checked) updateField('crmEmailEnabled', false);
                    }}
                    style={{ width: '16px', height: '16px', accentColor: '#198754' }}
                  />
                  Connect CRM System
                </label>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 0 24px' }}>
                  Add email as a campaign channel. AI generates email content alongside social posts.
                </p>
                {form.connectCRM && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', marginLeft: '24px', fontSize: '12px', color: '#555' }}>
                    <input
                      type="checkbox"
                      checked={form.crmEmailEnabled}
                      onChange={(e) => updateField('crmEmailEnabled', e.target.checked)}
                      style={{ width: '14px', height: '14px', accentColor: '#198754' }}
                    />
                    Include email blasts in this campaign
                  </label>
                )}
              </div>

              {/* Drip Campaign Integration */}
              <div style={{ padding: '14px', borderRadius: '8px', background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="checkbox"
                    checked={form.connectDrip}
                    onChange={(e) => updateField('connectDrip', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#6f42c1' }}
                  />
                  <i className="fa fa-filter" style={{ color: '#6f42c1' }}></i>
                  Connect Drip Campaigns
                </label>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 0 24px' }}>
                  AI will coordinate social posts with active drip email sequences for multi-touch campaigns.
                </p>
              </div>

              {/* Product Collection Integration */}
              <div style={{ padding: '14px', borderRadius: '8px', background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    type="checkbox"
                    checked={form.connectCollection}
                    onChange={(e) => updateField('connectCollection', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#d63384' }}
                  />
                  <i className="fa fa-th-large" style={{ color: '#d63384' }}></i>
                  Connect Product Collections
                </label>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 0 24px' }}>
                  AI will reference specific products and collections by name for product-aware marketing content.
                </p>
              </div>

              {/* Admin Notes */}
              <div style={{ padding: '14px', borderRadius: '8px', background: '#f8f9fa' }}>
                <label style={labelStyle}>Internal Notes</label>
                <textarea
                  value={form.adminNotes}
                  onChange={(e) => updateField('adminNotes', e.target.value)}
                  placeholder="Internal notes for the AI brief (objectives, special instructions, etc.)"
                  style={{ ...inputStyle, minHeight: '68px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SECTION 4: MEDIA ASSETS (available to all tiers) */}
          {/* ================================================================= */}
          <div className="section-box" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <i className="fa fa-images" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
              Media Assets
            </h2>
            {assets.length > 0 ? (
              <>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                  {assets.length} asset{assets.length !== 1 ? 's' : ''} in your library. AI will reference these when generating post concepts.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {assets.slice(0, 12).map((a, i) => {
                    const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata || '{}') : (a.metadata || {});
                    return (
                      <div key={a.id || i} style={{
                        width: '56px', height: '56px', borderRadius: '6px', background: '#f0f0f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        border: '1px solid #e0e0e0', fontSize: '11px', color: '#888',
                      }}>
                        {a.type === 'image' && a.file_path ? (
                          <img src={a.file_path} alt={meta.originalName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className={`fa ${a.type === 'video' ? 'fa-video' : 'fa-file'}`} style={{ fontSize: '18px' }}></i>
                        )}
                      </div>
                    );
                  })}
                  {assets.length > 12 && (
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '6px', background: '#f0f0f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', color: '#888', fontWeight: 600,
                    }}>
                      +{assets.length - 12}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                <i className="fa fa-cloud-upload-alt" style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}></i>
                <p style={{ fontSize: '13px', margin: '0 0 8px 0' }}>No media assets uploaded yet.</p>
                <a
                  href="/dashboard/marketing/social-central/library"
                  style={{ fontSize: '13px', color: 'var(--primary-color)', textDecoration: 'underline' }}
                >
                  Upload media in the Library
                </a>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* AI CONTEXT PREVIEW */}
          {/* ================================================================= */}
          <div style={{
            padding: '14px 18px', borderRadius: '8px', background: '#f0f4ff', border: '1px solid #d0daef',
            marginBottom: '24px', fontSize: '13px', color: '#444',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <i className="fa fa-brain" style={{ color: '#6f42c1' }}></i>
              <strong style={{ fontSize: '14px' }}>Leo AI Context</strong>
            </div>
            <p style={{ margin: 0, lineHeight: '1.5' }}>
              When you generate, Leo will automatically inject your <strong>artist profile</strong>, <strong>catalog patterns</strong>,{' '}
              <strong>color & style preferences</strong>, <strong>discovered brand truths</strong>,{' '}
              and <strong>engagement intelligence</strong> into Claude&apos;s creative brief.
              {assets.length > 0 && <> Your <strong>{assets.length} media assets</strong> will be referenced for visual suggestions.</>}
              {' '}The more data Leo has, the more personalized your campaign will be.
            </p>
          </div>

          {/* ================================================================= */}
          {/* SUBMIT */}
          {/* ================================================================= */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard/marketing/social-central')}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: '1px solid #dee2e6',
                background: '#fff', color: '#555', fontSize: '14px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating || !aiAvailable}
              style={{
                padding: '12px 32px', borderRadius: '8px', border: 'none',
                background: generating ? '#6c757d' : 'var(--gradient-primary)',
                color: '#fff', fontSize: '15px', fontWeight: 600, cursor: generating ? 'wait' : 'pointer',
                opacity: (!aiAvailable) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              {generating ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  Generating Campaign...
                </>
              ) : (
                <>
                  <i className="fa fa-magic"></i>
                  Generate with AI
                </>
              )}
            </button>
          </div>
        </form>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
            padding: '14px 20px', borderRadius: '10px', maxWidth: '380px',
            background: toast.type === 'success' ? '#d4edda' : '#f8d7da',
            color: toast.type === 'success' ? '#155724' : '#842029',
            border: `1px solid ${toast.type === 'success' ? '#c3e6cb' : '#f5c2c7'}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontSize: '14px', fontWeight: 500,
            animation: 'fadeIn 0.3s ease',
          }}>
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
            {toast.message}
          </div>
        )}

      </DashboardShell>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared inline styles (to keep consistent with global.css patterns)
// ---------------------------------------------------------------------------
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#444',
  marginBottom: '5px',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '6px',
  border: '1px solid #dee2e6', fontSize: '14px', color: '#333',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};
