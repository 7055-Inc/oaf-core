/**
 * CRM - Send Campaign (Single Blast)
 * Dashboard > CRM > Send Campaign
 * Compose and send email campaigns to subscribers.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { authApiRequest } from '../../../lib/apiUtils';
import {
  createSingleBlast,
  scheduleCampaign,
  sendCampaignNow,
  getRecipients,
  fetchTags
} from '../../../lib/email-marketing/api';

export default function SendCampaignPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [createdCampaignId, setCreatedCampaignId] = useState(null);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState(1); // 1: Compose, 2: Preview, 3: Success
  const router = useRouter();

  const [campaignData, setCampaignData] = useState({
    name: '',
    subject_line: '',
    template_key: 'simple-announcement',
    target_list_filter: {
      tags: [],
      status: 'subscribed'
    },
    send_option: 'now', // 'now' or 'scheduled'
    scheduled_send_at: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userData) {
      loadTags();
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

  const loadTags = async () => {
    try {
      const data = await fetchTags();
      if (data.success) {
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    try {
      // Create campaign
      const result = await createSingleBlast({
        name: campaignData.name,
        subject_line: campaignData.subject_line,
        template_key: campaignData.template_key,
        target_list_filter: campaignData.target_list_filter
      });

      if (result.success && result.campaign) {
        setCreatedCampaignId(result.campaign.id);
        
        // Get recipient count
        const recipients = await getRecipients(result.campaign.id);
        setRecipientCount(recipients.count || 0);
        
        setStep(2);
      }
    } catch (error) {
      alert('Error creating campaign: ' + error.message);
    }
  };

  const handleSend = async () => {
    if (!createdCampaignId) return;

    if (!confirm(`Send this campaign to ${recipientCount} subscribers?`)) return;

    setSending(true);
    try {
      if (campaignData.send_option === 'scheduled') {
        await scheduleCampaign(createdCampaignId, campaignData.scheduled_send_at);
        alert('Campaign scheduled successfully!');
      } else {
        await sendCampaignNow(createdCampaignId);
        alert('Campaign sent successfully!');
      }
      setStep(3);
    } catch (error) {
      alert('Error sending campaign: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setCampaignData({
      name: '',
      subject_line: '',
      template_key: 'simple-announcement',
      target_list_filter: {
        tags: [],
        status: 'subscribed'
      },
      send_option: 'now',
      scheduled_send_at: ''
    });
    setCreatedCampaignId(null);
    setRecipientCount(0);
    setStep(1);
  };

  const toggleTag = (tag) => {
    const currentTags = campaignData.target_list_filter.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    setCampaignData({
      ...campaignData,
      target_list_filter: {
        ...campaignData.target_list_filter,
        tags: newTags
      }
    });
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
        <title>CRM - Send Campaign | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Send Email Campaign</h1>
          <p className="page-subtitle">Create and send a single blast campaign to your subscribers</p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          {[
            { num: 1, label: 'Compose' },
            { num: 2, label: 'Preview & Send' },
            { num: 3, label: 'Success' }
          ].map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: step >= s.num ? '#055474' : '#e9ecef',
                color: step >= s.num ? 'white' : '#6c757d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {s.num}
              </div>
              <span style={{ fontWeight: step === s.num ? 'bold' : 'normal', color: step === s.num ? '#055474' : '#6c757d' }}>
                {s.label}
              </span>
              {i < 2 && <span style={{ marginLeft: '10px', color: '#ccc' }}>→</span>}
            </div>
          ))}
        </div>

        {/* Step 1: Compose */}
        {step === 1 && (
          <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', padding: '30px', maxWidth: '800px' }}>
            <form onSubmit={handlePreview}>
              {/* Campaign Name */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignData.name}
                  onChange={e => setCampaignData({ ...campaignData, name: e.target.value })}
                  placeholder="January Newsletter"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  required
                />
                <small style={{ fontSize: '12px', color: '#666' }}>Internal name for your records</small>
              </div>

              {/* Subject Line */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={campaignData.subject_line}
                  onChange={e => setCampaignData({ ...campaignData, subject_line: e.target.value })}
                  placeholder="New arrivals just in time for the holidays!"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  required
                />
                <small style={{ fontSize: '12px', color: '#666' }}>What subscribers will see in their inbox</small>
              </div>

              {/* Email Template */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Email Template *
                </label>
                <select
                  value={campaignData.template_key}
                  onChange={e => setCampaignData({ ...campaignData, template_key: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
                  required
                >
                  <option value="simple-announcement">Simple Announcement</option>
                  <option value="product-showcase">Product Showcase</option>
                  <option value="event-invitation">Event Invitation</option>
                  <option value="monthly-newsletter">Monthly Newsletter</option>
                  <option value="special-offer">Special Offer</option>
                </select>
              </div>

              {/* Recipients Filter */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Send To
                </label>
                
                {/* Status Filter */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '13px', color: '#666', marginBottom: '5px', display: 'block' }}>Subscriber Status</label>
                  <select
                    value={campaignData.target_list_filter.status}
                    onChange={e => setCampaignData({
                      ...campaignData,
                      target_list_filter: { ...campaignData.target_list_filter, status: e.target.value }
                    })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
                  >
                    <option value="">All Statuses</option>
                    <option value="subscribed">Subscribed Only</option>
                  </select>
                </div>

                {/* Tag Filter */}
                <div>
                  <label style={{ fontSize: '13px', color: '#666', marginBottom: '5px', display: 'block' }}>
                    Filter by Tags (optional)
                  </label>
                  {tags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '50px' }}>
                      {tags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            background: (campaignData.target_list_filter.tags || []).includes(tag) ? '#055474' : '#e9ecef',
                            color: (campaignData.target_list_filter.tags || []).includes(tag) ? 'white' : '#333'
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
                      No tags available yet
                    </div>
                  )}
                  {(campaignData.target_list_filter.tags || []).length === 0 && (
                    <small style={{ fontSize: '11px', color: '#666', display: 'block', marginTop: '5px' }}>
                      No tags selected - will send to all {campaignData.target_list_filter.status || 'active'} subscribers
                    </small>
                  )}
                  {(campaignData.target_list_filter.tags || []).length > 0 && (
                    <small style={{ fontSize: '11px', color: '#666', display: 'block', marginTop: '5px' }}>
                      Will send to subscribers with tags: {(campaignData.target_list_filter.tags || []).join(', ')}
                    </small>
                  )}
                </div>
              </div>

              {/* Send Options */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Send Options
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="send_option"
                      value="now"
                      checked={campaignData.send_option === 'now'}
                      onChange={e => setCampaignData({ ...campaignData, send_option: e.target.value })}
                    />
                    <span>Send Now</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="send_option"
                      value="scheduled"
                      checked={campaignData.send_option === 'scheduled'}
                      onChange={e => setCampaignData({ ...campaignData, send_option: e.target.value })}
                    />
                    <span>Schedule for Later</span>
                  </label>
                </div>

                {campaignData.send_option === 'scheduled' && (
                  <div style={{ marginTop: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                      Send Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={campaignData.scheduled_send_at}
                      onChange={e => setCampaignData({ ...campaignData, scheduled_send_at: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                      required={campaignData.send_option === 'scheduled'}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '15px',
                  background: '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                Preview Campaign →
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Preview & Send */}
        {step === 2 && (
          <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', padding: '30px', maxWidth: '800px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '22px' }}>Review Campaign</h2>

            {/* Campaign Details */}
            <div style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Campaign Name</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{campaignData.name}</div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Subject Line</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{campaignData.subject_line}</div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Template</div>
                <div style={{ fontSize: '14px' }}>{campaignData.template_key}</div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Recipients</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#055474' }}>{recipientCount} subscribers</div>
                {(campaignData.target_list_filter.tags || []).length > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Filtered by tags: {(campaignData.target_list_filter.tags || []).join(', ')}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Send Time</div>
                <div style={{ fontSize: '14px' }}>
                  {campaignData.send_option === 'now' ? 'Immediately' : new Date(campaignData.scheduled_send_at).toLocaleString()}
                </div>
              </div>
            </div>

            {recipientCount === 0 && (
              <div style={{ padding: '20px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', marginBottom: '20px' }}>
                <strong>⚠️ Warning:</strong> No recipients match your filter criteria. Please go back and adjust your filters.
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                ← Back to Edit
              </button>
              <button
                onClick={handleSend}
                disabled={sending || recipientCount === 0}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: recipientCount === 0 ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: recipientCount === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                {sending ? 'Sending...' : (campaignData.send_option === 'now' ? 'Send Now' : 'Schedule Campaign')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', padding: '50px', maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '26px', color: '#28a745' }}>Campaign {campaignData.send_option === 'now' ? 'Sent' : 'Scheduled'}!</h2>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
              {campaignData.send_option === 'now'
                ? `Your campaign has been sent to ${recipientCount} subscribers.`
                : `Your campaign has been scheduled to send to ${recipientCount} subscribers on ${new Date(campaignData.scheduled_send_at).toLocaleString()}.`
              }
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={resetForm}
                style={{
                  padding: '12px 24px',
                  background: '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Send Another Campaign
              </button>
              <button
                onClick={() => router.push('/dashboard/crm/analytics')}
                style={{
                  padding: '12px 24px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                View Analytics
              </button>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
