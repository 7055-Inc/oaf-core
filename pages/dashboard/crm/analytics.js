/**
 * CRM - Analytics Dashboard
 * Dashboard > CRM > Analytics
 * View email marketing performance metrics and campaign stats.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { authApiRequest } from '../../../lib/apiUtils';
import {
  fetchAnalyticsOverview,
  fetchCampaigns,
  fetchCampaignAnalytics,
  fetchListGrowth
} from '../../../lib/email-marketing/api';

export default function AnalyticsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [listGrowth, setListGrowth] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userData) {
      loadAllData();
    }
  }, [userData]);

  const loadUser = async () => {
    try {
      const response = await authApiRequest('users/me', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      const [overviewData, campaignsData, growthData] = await Promise.all([
        fetchAnalyticsOverview(),
        fetchCampaigns({ type: 'single_blast', limit: 50 }),
        fetchListGrowth(30)
      ]);

      if (overviewData.success) {
        setOverview(overviewData.data);
      }
      if (campaignsData.success) {
        setCampaigns(campaignsData.campaigns || []);
      }
      if (growthData.success) {
        setListGrowth(growthData.growth_data || []);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const viewCampaignDetails = async (campaign) => {
    setSelectedCampaign(campaign);
    setDetailsLoading(true);
    try {
      const data = await fetchCampaignAnalytics(campaign.id);
      if (data.success) {
        setCampaignDetails(data.data);
      }
    } catch (error) {
      console.error('Error loading campaign details:', error);
      alert('Error loading campaign details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeCampaignDetails = () => {
    setSelectedCampaign(null);
    setCampaignDetails(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const formatPercent = (num) => {
    if (num === undefined || num === null) return '0%';
    return `${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <>
      <Head>
        <title>CRM - Analytics | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Email Marketing Analytics</h1>
          <p className="page-subtitle">Track performance and engagement metrics</p>
        </div>

        {/* Overview Stats */}
        {overview && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {[
                { label: 'Total Subscribers', value: formatNumber(overview.total_subscribers), color: '#495057', icon: '👥' },
                { label: 'Active Subscribers', value: formatNumber(overview.active_subscribers), color: '#28a745', icon: '✅' },
                { label: 'Unsubscribed', value: formatNumber(overview.unsubscribed), color: '#6c757d', icon: '❌' },
                { label: 'Average Open Rate', value: formatPercent(overview.open_rate), color: '#055474', icon: '📧' },
                { label: 'Average Click Rate', value: formatPercent(overview.click_rate), color: '#17a2b8', icon: '🖱️' },
                { label: 'Total Campaigns', value: formatNumber(campaigns.length), color: '#6610f2', icon: '📨' }
              ].map(stat => (
                <div key={stat.label} style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>{stat.label}</div>
                    <div style={{ fontSize: '24px' }}>{stat.icon}</div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List Growth Chart */}
        {listGrowth.length > 0 && (
          <div style={{ marginBottom: '30px', background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>List Growth (Last 30 Days)</h2>
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {listGrowth.map((day, i) => {
                const maxCount = Math.max(...listGrowth.map(d => d.count || 0));
                const height = maxCount > 0 ? ((day.count || 0) / maxCount) * 100 : 0;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: '#055474',
                      borderRadius: '2px 2px 0 0',
                      minHeight: '2px',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    title={`${day.date}: ${day.count} new subscribers`}
                  />
                );
              })}
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Daily new subscribers
            </div>
          </div>
        )}

        {/* Campaigns List */}
        <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
            <h2 style={{ fontSize: '20px', margin: 0 }}>Campaign Performance</h2>
          </div>

          {campaigns.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Campaign</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Subject Line</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Sent</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Opens</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Open Rate</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Clicks</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Click Rate</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(campaign => {
                    const sentCount = campaign.stats?.total_sent || 0;
                    const openCount = campaign.stats?.total_opens || 0;
                    const clickCount = campaign.stats?.total_clicks || 0;
                    const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
                    const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;

                    return (
                      <tr key={campaign.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <strong>{campaign.name}</strong>
                        </td>
                        <td style={{ padding: '12px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {campaign.subject_line || '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{formatNumber(sentCount)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{formatNumber(openCount)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 8px', background: openRate >= 20 ? '#d4edda' : openRate >= 10 ? '#fff3cd' : '#f8d7da', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                            {formatPercent(openRate)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{formatNumber(clickCount)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 8px', background: clickRate >= 5 ? '#d4edda' : clickRate >= 2 ? '#fff3cd' : '#f8d7da', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                            {formatPercent(clickRate)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                          {formatDate(campaign.sent_at || campaign.created_at)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => viewCampaignDetails(campaign)}
                            style={{ padding: '6px 12px', background: '#055474', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No campaigns sent yet. <a href="/dashboard/crm/send-campaign" style={{ color: '#055474', textDecoration: 'underline' }}>Send your first campaign</a>.
            </div>
          )}
        </div>

        {/* Campaign Details Modal */}
        {selectedCampaign && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '8px', width: '800px', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <h3 style={{ margin: 0, marginBottom: '5px' }}>{selectedCampaign.name}</h3>
                <div style={{ fontSize: '14px', color: '#666' }}>{selectedCampaign.subject_line}</div>
              </div>

              {detailsLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
                  <div className="spinner"></div>
                  <p>Loading campaign details...</p>
                </div>
              ) : campaignDetails ? (
                <div style={{ padding: '20px' }}>
                  {/* Send Stats */}
                  <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Send Statistics</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Sent', value: formatNumber(campaignDetails.total_sent), color: '#495057' },
                        { label: 'Delivered', value: formatNumber(campaignDetails.total_delivered), color: '#28a745' },
                        { label: 'Bounced', value: formatNumber(campaignDetails.total_bounced), color: '#dc3545' },
                        { label: 'Opened', value: formatNumber(campaignDetails.total_opens), color: '#055474' },
                      ].map(stat => (
                        <div key={stat.label} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Engagement Stats */}
                  <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Engagement</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Clicks', value: formatNumber(campaignDetails.total_clicks), color: '#17a2b8' },
                        { label: 'Unsubscribes', value: formatNumber(campaignDetails.total_unsubscribes), color: '#6c757d' },
                        { label: 'Spam Reports', value: formatNumber(campaignDetails.total_spam_reports), color: '#dc3545' },
                      ].map(stat => (
                        <div key={stat.label} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rates */}
                  <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Performance Rates</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Open Rate', value: formatPercent(campaignDetails.open_rate), color: '#055474' },
                        { label: 'Click Rate', value: formatPercent(campaignDetails.click_rate), color: '#17a2b8' },
                        { label: 'Bounce Rate', value: formatPercent(campaignDetails.bounce_rate), color: '#dc3545' },
                      ].map(stat => (
                        <div key={stat.label} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Clicked Links */}
                  {campaignDetails.top_clicked_links && campaignDetails.top_clicked_links.length > 0 && (
                    <div style={{ marginBottom: '25px' }}>
                      <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Top Clicked Links</h4>
                      <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '15px' }}>
                        {campaignDetails.top_clicked_links.map((link, i) => (
                          <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < campaignDetails.top_clicked_links.length - 1 ? '1px solid #dee2e6' : 'none' }}>
                            <div style={{ fontSize: '14px', marginBottom: '5px', wordBreak: 'break-all' }}>{link.url}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{formatNumber(link.click_count)} clicks</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No detailed analytics available for this campaign.
                </div>
              )}

              <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', position: 'sticky', bottom: 0 }}>
                <button onClick={closeCampaignDetails} style={{ width: '100%', padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
