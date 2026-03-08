/**
 * Social Central - Campaign Dashboard
 * Dashboard > Marketing > Social Central > Campaigns
 *
 * Overview page showing:
 *   1. Quick stats (total campaigns, scheduled, published, engagement)
 *   2. All campaigns list with status, post counts, platforms
 *   3. Monthly calendar view of scheduled & published posts
 *   4. Channel performance breakdown
 */

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../../lib/users/api';
import {
  fetchCampaigns,
  fetchCalendar,
  fetchScheduleQueue,
  fetchAnalyticsOverview,
  fetchChannelPerformance,
  PLATFORMS,
} from '../../../../../lib/social-central/api';

const STATUS_MAP = {
  draft:     { label: 'Draft',     bg: '#fff3cd', color: '#856404', icon: 'fa-pencil' },
  active:    { label: 'Active',    bg: '#d4edda', color: '#155724', icon: 'fa-play' },
  paused:    { label: 'Paused',    bg: '#e9ecef', color: '#6c757d', icon: 'fa-pause' },
  completed: { label: 'Completed', bg: '#cce5ff', color: '#004085', icon: 'fa-check' },
  cancelled: { label: 'Cancelled', bg: '#f8d7da', color: '#842029', icon: 'fa-times' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CampaignDashboardPage() {
  const router = useRouter();

  // Auth
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [campaigns, setCampaigns] = useState([]);
  const [scheduledQueue, setScheduledQueue] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [channelPerf, setChannelPerf] = useState([]);

  // UI
  const [activeTab, setActiveTab] = useState('campaigns'); // campaigns | calendar | analytics
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------
  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (userData) {
      loadCampaigns();
      loadScheduleQueue();
      loadAnalytics();
      loadChannelPerformance();
    }
  }, [userData]);
  useEffect(() => { if (userData) loadCalendar(); }, [userData, calMonth, calYear]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); } }, [toast]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      if (!data?.permissions?.includes('leo_social')) { router.push('/dashboard/marketing'); return; }
      setUserData(data);
    } catch { router.push('/login?redirect=/dashboard/marketing/social-central/campaigns'); }
    finally { setLoading(false); }
  };

  const loadCampaigns = async () => {
    try {
      const data = await fetchCampaigns();
      if (data.success) setCampaigns(data.campaigns || []);
    } catch {}
  };

  const loadScheduleQueue = async () => {
    try {
      const data = await fetchScheduleQueue();
      if (data.success) setScheduledQueue(data.content || []);
    } catch {}
  };

  const loadCalendar = async () => {
    try {
      const startDate = new Date(calYear, calMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0];
      const data = await fetchCalendar(startDate, endDate);
      if (data.success) setCalendarData(data.calendar || {});
    } catch {}
  };

  const loadAnalytics = async () => {
    try {
      const data = await fetchAnalyticsOverview();
      if (data.success) setAnalytics(data.overview || data.data || null);
    } catch {}
  };

  const loadChannelPerformance = async () => {
    try {
      const data = await fetchChannelPerformance();
      if (data.success) setChannelPerf(data.channels || data.data || []);
    } catch {}
  };

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const filteredCampaigns = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter);

  const totalPosts = campaigns.reduce((sum, c) => sum + (c.total_content || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const scheduledPosts = scheduledQueue.length;

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const weeks = [];
    let currentWeek = new Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      currentWeek.push({ day, dateKey, events: calendarData[dateKey] || [] });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }
    return weeks;
  }, [calMonth, calYear, calendarData]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Campaigns | Social Central | Brakebee</title></Head>
        <div className="loading-state"><div className="spinner"></div><span>Loading...</span></div>
      </DashboardShell>
    );
  }
  if (!userData) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <Head><title>Campaigns | Social Central | Brakebee</title></Head>
      <DashboardShell userData={userData}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => router.push('/dashboard/marketing/social-central')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6c757d' }}>
              <i className="fa fa-arrow-left"></i>
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px' }}>Campaign Dashboard</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#888' }}>Manage campaigns, view schedule, track performance</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/marketing/social-central/campaigns/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: 'var(--gradient-primary)', color: '#fff',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <i className="fa fa-plus"></i> New Campaign
          </button>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <StatCard label="Total Campaigns" value={campaigns.length} icon="fa-bullhorn" color="var(--primary-color)" />
          <StatCard label="Active" value={activeCampaigns} icon="fa-play-circle" color="#28a745" />
          <StatCard label="Scheduled Posts" value={scheduledPosts} icon="fa-clock" color="#17a2b8" />
          <StatCard label="Total Content" value={totalPosts} icon="fa-file-alt" color="#6f42c1" />
          <StatCard
            label="Engagement"
            value={analytics?.total_engagement?.toLocaleString() || '—'}
            icon="fa-heart"
            color="#e83e8c"
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e9ecef', paddingBottom: '0' }}>
          {[
            { id: 'campaigns', label: 'Campaigns', icon: 'fa-bullhorn' },
            { id: 'calendar',  label: 'Calendar',  icon: 'fa-calendar' },
            { id: 'analytics', label: 'Analytics',  icon: 'fa-chart-bar' },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', fontSize: '13px', fontWeight: 600,
                border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                background: 'none', color: activeTab === tab.id ? 'var(--primary-color)' : '#888',
                cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.15s ease',
              }}
            >
              <i className={`fa ${tab.icon}`} style={{ marginRight: '6px' }}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============== TAB: Campaigns List ============== */}
        {activeTab === 'campaigns' && (
          <div>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['all', 'draft', 'active', 'paused', 'completed'].map(s => (
                <button key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 600,
                    border: statusFilter === s ? '1px solid var(--primary-color)' : '1px solid #dee2e6',
                    background: statusFilter === s ? 'var(--primary-color)' : '#fff',
                    color: statusFilter === s ? '#fff' : '#555', cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >{s === 'all' ? 'All Campaigns' : s}</button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Campaign list */}
            {filteredCampaigns.length === 0 ? (
              <div className="section-box" style={{ textAlign: 'center', padding: '50px 20px' }}>
                <i className="fa fa-bullhorn" style={{ fontSize: '42px', color: '#dee2e6', display: 'block', marginBottom: '12px' }}></i>
                <h3 style={{ color: '#6c757d', marginBottom: '6px', fontSize: '16px' }}>No campaigns yet</h3>
                <p style={{ color: '#adb5bd', fontSize: '13px', marginBottom: '16px' }}>Create your first AI-powered campaign to get started.</p>
                <button
                  onClick={() => router.push('/dashboard/marketing/social-central/campaigns/new')}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: 'var(--primary-color)', color: '#fff',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <i className="fa fa-plus" style={{ marginRight: '6px' }}></i> New Campaign
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredCampaigns.map(camp => {
                  const sm = STATUS_MAP[camp.status] || STATUS_MAP.draft;
                  const platforms = (camp.platforms || camp.channels || '').split(',').filter(Boolean);
                  return (
                    <div key={camp.id}
                      className="section-box"
                      style={{ padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s ease' }}
                      onClick={() => router.push(`/dashboard/marketing/social-central/campaigns/${camp.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        {/* Status icon */}
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px',
                          background: sm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <i className={`fa ${sm.icon}`} style={{ color: sm.color, fontSize: '14px' }}></i>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#333' }}>{camp.name}</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                              background: sm.bg, color: sm.color, textTransform: 'capitalize',
                            }}>{sm.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#888' }}>
                            {camp.start_date && (
                              <span>
                                <i className="fa fa-calendar" style={{ marginRight: '3px' }}></i>
                                {camp.start_date}{camp.end_date ? ` — ${camp.end_date}` : ''}
                              </span>
                            )}
                            {camp.total_content > 0 && (
                              <span>
                                <i className="fa fa-file-alt" style={{ marginRight: '3px' }}></i>
                                {camp.total_content} post{camp.total_content !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Platforms */}
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          {platforms.map(p => {
                            const pl = PLATFORMS[p.trim()];
                            return pl ? (
                              <span key={p} style={{
                                width: '28px', height: '28px', borderRadius: '6px',
                                background: pl.colorLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <i className={`${pl.isCRM ? 'fa' : 'fab'} ${pl.icon}`} style={{ color: pl.color, fontSize: '12px' }}></i>
                              </span>
                            ) : null;
                          })}
                        </div>

                        {/* Arrow */}
                        <i className="fa fa-chevron-right" style={{ color: '#ccc', fontSize: '12px', flexShrink: 0 }}></i>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============== TAB: Calendar ============== */}
        {activeTab === 'calendar' && (
          <div>
            {/* Month nav */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
              marginBottom: '16px',
            }}>
              <button onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }} style={navBtnStyle}><i className="fa fa-chevron-left"></i></button>
              <span style={{ fontSize: '16px', fontWeight: 700, minWidth: '180px', textAlign: 'center' }}>
                {MONTHS[calMonth]} {calYear}
              </span>
              <button onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }} style={navBtnStyle}><i className="fa fa-chevron-right"></i></button>
            </div>

            {/* Calendar grid */}
            <div className="section-box" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e9ecef' }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    padding: '10px 0', textAlign: 'center', fontSize: '11px', fontWeight: 700,
                    color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>{d}</div>
                ))}
              </div>

              {/* Weeks */}
              {calendarGrid.map((week, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < calendarGrid.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  {week.map((cell, ci) => (
                    <div key={ci} style={{
                      minHeight: '80px', padding: '6px', borderRight: ci < 6 ? '1px solid #f0f0f0' : 'none',
                      background: cell?.dateKey === todayKey ? '#f0fdf4' : (cell ? '#fff' : '#fafafa'),
                    }}>
                      {cell && (
                        <>
                          <div style={{
                            fontSize: '12px', fontWeight: cell.dateKey === todayKey ? 700 : 500,
                            color: cell.dateKey === todayKey ? '#28a745' : '#555',
                            marginBottom: '4px',
                          }}>{cell.day}</div>
                          {cell.events.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {cell.events.slice(0, 3).map((ev, ei) => {
                                const pl = PLATFORMS[ev.channel];
                                return (
                                  <div key={ei} style={{
                                    padding: '2px 4px', borderRadius: '3px', fontSize: '9px',
                                    fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    background: ev.status === 'published' ? '#d4edda' : '#cce5ff',
                                    color: ev.status === 'published' ? '#155724' : '#004085',
                                  }}>
                                    {pl && <i className={`${pl.isCRM ? 'fa' : 'fab'} ${pl.icon}`} style={{ marginRight: '2px' }}></i>}
                                    {ev.campaign_name || ev.type}
                                  </div>
                                );
                              })}
                              {cell.events.length > 3 && (
                                <div style={{ fontSize: '9px', color: '#888', fontWeight: 600 }}>
                                  +{cell.events.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Upcoming queue */}
            {scheduledQueue.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>
                  <i className="fa fa-list" style={{ marginRight: '8px', color: '#17a2b8' }}></i>
                  Upcoming Queue ({scheduledQueue.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scheduledQueue.slice(0, 10).map(item => {
                    const pl = PLATFORMS[item.channel];
                    const c = typeof item.content === 'string' ? JSON.parse(item.content) : (item.content || {});
                    return (
                      <div key={item.id} className="section-box" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {pl && (
                            <span style={{
                              width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                              background: pl.colorLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <i className={`${pl.isCRM ? 'fa' : 'fab'} ${pl.icon}`} style={{ color: pl.color, fontSize: '12px' }}></i>
                            </span>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', color: '#333', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.caption?.substring(0, 80) || c.title || 'Scheduled post'}
                              {c.caption?.length > 80 ? '...' : ''}
                            </div>
                            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                              <i className="fa fa-clock" style={{ marginRight: '3px' }}></i>
                              {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : 'Pending'}
                              {item.campaign_name && <> &middot; {item.campaign_name}</>}
                            </div>
                          </div>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                            background: '#cce5ff', color: '#004085', textTransform: 'capitalize', flexShrink: 0,
                          }}>{item.type}</span>
                        </div>
                      </div>
                    );
                  })}
                  {scheduledQueue.length > 10 && (
                    <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                      +{scheduledQueue.length - 10} more scheduled posts
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============== TAB: Analytics ============== */}
        {activeTab === 'analytics' && (
          <div>
            {/* Analytics overview cards */}
            {analytics ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <StatCard label="Impressions" value={(analytics.total_impressions || 0).toLocaleString()} icon="fa-eye" color="#17a2b8" />
                <StatCard label="Engagements" value={(analytics.total_engagement || 0).toLocaleString()} icon="fa-heart" color="#e83e8c" />
                <StatCard label="Clicks" value={(analytics.total_clicks || 0).toLocaleString()} icon="fa-mouse-pointer" color="#fd7e14" />
                <StatCard label="Shares" value={(analytics.total_shares || 0).toLocaleString()} icon="fa-share" color="#6f42c1" />
                <StatCard label="Avg. Engagement" value={analytics.avg_engagement_rate ? `${analytics.avg_engagement_rate.toFixed(1)}%` : '—'} icon="fa-chart-line" color="#28a745" />
              </div>
            ) : (
              <div className="section-box" style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
                <i className="fa fa-chart-bar" style={{ fontSize: '36px', color: '#dee2e6', display: 'block', marginBottom: '10px' }}></i>
                <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                  Analytics will appear once posts are published and metrics start coming in.
                </p>
              </div>
            )}

            {/* Channel Performance */}
            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>
              <i className="fa fa-chart-pie" style={{ marginRight: '8px', color: '#6f42c1' }}></i>
              Channel Performance
            </h3>
            {channelPerf.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {channelPerf.map(ch => {
                  const pl = PLATFORMS[ch.channel];
                  return (
                    <div key={ch.channel} className="section-box" style={{ padding: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        {pl && (
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: pl.colorLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <i className={`${pl.isCRM ? 'fa' : 'fab'} ${pl.icon}`} style={{ color: pl.color, fontSize: '16px' }}></i>
                          </div>
                        )}
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{pl?.name || ch.channel}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div><span style={{ color: '#888' }}>Posts:</span> <strong>{ch.total_posts || 0}</strong></div>
                        <div><span style={{ color: '#888' }}>Impressions:</span> <strong>{(ch.impressions || 0).toLocaleString()}</strong></div>
                        <div><span style={{ color: '#888' }}>Engagements:</span> <strong>{(ch.engagement || 0).toLocaleString()}</strong></div>
                        <div><span style={{ color: '#888' }}>Clicks:</span> <strong>{(ch.clicks || 0).toLocaleString()}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="section-box" style={{ padding: '30px', textAlign: 'center' }}>
                <p style={{ color: '#adb5bd', fontSize: '13px', margin: 0 }}>
                  No channel data yet. Publish content to see performance by platform.
                </p>
              </div>
            )}

            {/* Per-campaign performance */}
            {campaigns.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>
                  <i className="fa fa-bullhorn" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                  Campaign Performance
                </h3>
                <div className="section-box" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                        <th style={thStyle}>Campaign</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Posts</th>
                        <th style={thStyle}>Dates</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(camp => {
                        const sm = STATUS_MAP[camp.status] || STATUS_MAP.draft;
                        return (
                          <tr key={camp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={tdStyle}>
                              <span style={{ fontWeight: 600, color: '#333' }}>{camp.name}</span>
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                                background: sm.bg, color: sm.color,
                              }}>{sm.label}</span>
                            </td>
                            <td style={tdStyle}>{camp.total_content || 0}</td>
                            <td style={tdStyle}>
                              <span style={{ fontSize: '11px', color: '#888' }}>
                                {camp.start_date || '—'}{camp.end_date ? ` — ${camp.end_date}` : ''}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/marketing/social-central/campaigns/${camp.id}`); }}
                                style={{
                                  padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                  border: '1px solid var(--primary-color)', background: 'transparent',
                                  color: 'var(--primary-color)', cursor: 'pointer',
                                }}
                              >View Posts</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 1001,
            padding: '14px 20px', borderRadius: '10px', maxWidth: '380px',
            background: toast.type === 'success' ? '#d4edda' : '#f8d7da',
            color: toast.type === 'success' ? '#155724' : '#842029',
            border: `1px solid ${toast.type === 'success' ? '#c3e6cb' : '#f5c2c7'}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: 500,
          }}>
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
            {toast.message}
          </div>
        )}

      </DashboardShell>
    </>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function StatCard({ label, value, icon, color }) {
  return (
    <div className="section-box" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`fa ${icon}`} style={{ color, fontSize: '16px' }}></i>
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#333', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );
}

// Table styles
const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '10px 14px', verticalAlign: 'middle' };
const navBtnStyle = { background: 'none', border: '1px solid #dee2e6', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '14px' };
