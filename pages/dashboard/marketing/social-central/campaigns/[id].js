/**
 * Social Central - Campaign Post Queue (AI Review)
 * Dashboard > Marketing > Social Central > Campaigns > [id]
 *
 * Shows all AI-generated posts for a campaign. Each post card displays:
 *   - Matched media preview (image/video thumbnail)
 *   - Platform badge + post type
 *   - AI-generated caption, hashtags, CTA
 *   - Visual direction notes
 *   - Media composition status (queued/processing/ready)
 *   - Actions: Approve, Revise text, Reimagine, Re-match media
 *
 * Users review the full package (media + text) and either approve or give feedback.
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../../lib/users/api';
import { authApiRequest } from '../../../../../lib/apiUtils';
import { revisePost, reimaginePost, suggestPostingTime, approveAndSchedule, PLATFORMS } from '../../../../../lib/social-central/api';

// Status badge colors
const STATUS_COLORS = {
  draft:      { bg: '#fff3cd', color: '#856404', label: 'Pending Review' },
  approved:   { bg: '#d4edda', color: '#155724', label: 'Approved' },
  scheduled:  { bg: '#cce5ff', color: '#004085', label: 'Scheduled' },
  published:  { bg: '#d1ecf1', color: '#0c5460', label: 'Published' },
  rejected:   { bg: '#f8d7da', color: '#842029', label: 'Needs Changes' },
};

export default function CampaignPostQueuePage() {
  const router = useRouter();
  const { id: campaignId } = router.query;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [expandedPost, setExpandedPost] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // post id being acted on
  const [reviseModal, setReviseModal] = useState(null); // { postId, postIndex }
  const [reviseFeedback, setReviseFeedback] = useState('');
  const [scheduleModal, setScheduleModal] = useState(null); // { postId, postIndex, platform }
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null); // { suggestedTime, suggestedDay, rationale }
  const [aiSugLoading, setAiSugLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingStatuses, setPendingStatuses] = useState({}); // { pendingImageId: { status, permanentUrl, thumbnailUrl } }

  // Load user
  useEffect(() => { if (campaignId) loadUser(); }, [campaignId]);
  useEffect(() => { if (userData && campaignId) loadCampaign(); }, [userData, campaignId]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      if (!data?.permissions?.includes('leo_social')) { router.push('/dashboard/marketing'); return; }
      setUserData(data);
    } catch (err) { router.push('/login'); }
  };

  const loadCampaign = async () => {
    setLoading(true);
    try {
      // Load campaign
      const campRes = await authApiRequest(`api/v2/marketing/campaigns/${campaignId}`, { method: 'GET' });
      if (campRes.ok) {
        const campData = await campRes.json();
        if (campData.success) setCampaign(campData.campaign);
      }

      // Load campaign content (posts)
      const contentRes = await authApiRequest(`api/v2/marketing/content?campaign_id=${campaignId}`, { method: 'GET' });
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        if (contentData.success) {
          const items = (contentData.content || []).map(item => ({
            ...item,
            content: typeof item.content === 'string' ? JSON.parse(item.content) : (item.content || {}),
          }));
          setPosts(items);
        }
      }
    } catch (err) {
      console.error('Error loading campaign:', err);
      setToast({ type: 'error', message: 'Failed to load campaign data.' });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Poll pending_images for image processing status
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!posts.length) return;

    // Collect all pendingImageIds from post compositions
    const pendingIds = [];
    posts.forEach(post => {
      const comp = (typeof post.content === 'object' ? post.content : {}).composition;
      if (comp?.pendingImageId && (!pendingStatuses[comp.pendingImageId] || pendingStatuses[comp.pendingImageId].status === 'pending')) {
        pendingIds.push(comp.pendingImageId);
      }
    });

    if (pendingIds.length === 0) return;

    let cancelled = false;

    const pollStatuses = async () => {
      try {
        const res = await authApiRequest('api/v2/marketing/media/pending/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: pendingIds }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.pendingImages) {
            const updates = {};
            data.pendingImages.forEach(img => {
              updates[img.id] = { status: img.status, permanentUrl: img.permanentUrl, thumbnailUrl: img.thumbnailUrl };
            });
            if (!cancelled) {
              setPendingStatuses(prev => ({ ...prev, ...updates }));
            }
          }
        }
      } catch (err) {
        console.warn('Pending image poll error:', err);
      }
    };

    pollStatuses();
    const interval = setInterval(pollStatuses, 10000); // poll every 10s
    return () => { cancelled = true; clearInterval(interval); };
  }, [posts]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  // Open the scheduling modal for a single post — fetch AI suggestion in background
  const openScheduleModal = (postId, postIndex) => {
    const post = posts[postIndex];
    setScheduleModal({ postId, postIndex, platform: post.channel });
    setScheduleDate('');
    setScheduleTime('');
    setAiSuggestion(null);

    // Fetch AI time suggestion in background
    setAiSugLoading(true);
    suggestPostingTime({
      platform: post.channel,
      contentType: post.type || 'post',
      caption: post.content?.caption || '',
    })
      .then(result => {
        if (result.success && result.data) {
          setAiSuggestion(result.data);
          // Pre-fill with suggestion
          if (result.data.suggestedTime) {
            const sug = parseSuggestion(result.data);
            setScheduleDate(sug.date);
            setScheduleTime(sug.time);
          }
        }
      })
      .catch(() => {})
      .finally(() => setAiSugLoading(false));
  };

  // Parse the AI suggestion into a date + time for the pickers
  const parseSuggestion = (sug) => {
    const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const now = new Date();
    let targetDate = new Date(now);

    // Find the next occurrence of the suggested day
    if (sug.suggestedDay && dayMap[sug.suggestedDay] !== undefined) {
      const targetDay = dayMap[sug.suggestedDay];
      const diff = (targetDay - now.getDay() + 7) % 7 || 7; // at least 1 day ahead
      targetDate.setDate(now.getDate() + diff);
    } else {
      targetDate.setDate(now.getDate() + 1); // default: tomorrow
    }

    // Parse suggested time (e.g. "10:00 AM", "14:00", "2:30 PM")
    let hours = 10, minutes = 0;
    if (sug.suggestedTime) {
      const match = sug.suggestedTime.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2] || '0', 10);
        if (match[3]) {
          if (match[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
      }
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { date: dateStr, time: timeStr };
  };

  // Confirm schedule from modal
  const handleConfirmSchedule = async () => {
    if (!scheduleModal) return;
    const { postId } = scheduleModal;

    if (!scheduleDate || !scheduleTime) {
      setToast({ type: 'error', message: 'Please select a date and time.' });
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    setActionLoading(postId);

    try {
      const result = await approveAndSchedule(postId, scheduledAt);
      if (result.success) {
        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? { ...p, status: result.status || 'scheduled', scheduled_at: scheduledAt }
              : p
          )
        );
        const when = new Date(scheduledAt).toLocaleString();
        setToast({
          type: 'success',
          message: result.has_conflicts
            ? `Scheduled for ${when} — note: another post is scheduled nearby on this platform.`
            : `Post approved & scheduled for ${when}.`,
        });
        setScheduleModal(null);
      } else {
        setToast({ type: 'error', message: result.error || 'Failed to schedule.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Approve without scheduling (just approve)
  const handleApproveOnly = async (postId) => {
    setActionLoading(postId);
    try {
      const result = await approveAndSchedule(postId); // no scheduled_at → approve only
      if (result.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
        setToast({ type: 'success', message: 'Post approved. You can schedule it later.' });
        setScheduleModal(null);
      } else {
        setToast({ type: 'error', message: result.error || 'Failed to approve.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevise = async (postIndex) => {
    const post = posts[postIndex];
    if (!reviseFeedback.trim()) return;

    setActionLoading(post.id);
    try {
      const result = await revisePost({
        originalPost: post.content,
        feedback: reviseFeedback.trim(),
        platform: post.channel,
      });

      if (result.success) {
        // Update the post content with the revision
        const updatedContent = {
          ...post.content,
          caption: result.data.caption,
          hashtags: result.data.hashtags || post.content.hashtags,
          callToAction: result.data.callToAction || post.content.callToAction,
        };

        // Save to backend
        await authApiRequest(`api/v2/marketing/content/${post.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: updatedContent }),
        });

        setPosts(prev => prev.map((p, i) => i === postIndex ? { ...p, content: updatedContent } : p));
        setReviseModal(null);
        setReviseFeedback('');
        setToast({ type: 'success', message: 'Post revised by AI based on your feedback.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReimagine = async (postIndex) => {
    const post = posts[postIndex];
    setActionLoading(post.id);
    try {
      const result = await reimaginePost({
        originalPost: post.content,
        platform: post.channel,
        mediaDescription: post.content.suggestedMediaDescription,
      });

      if (result.success) {
        const updatedContent = {
          ...post.content,
          caption: result.data.caption,
          hashtags: result.data.hashtags || [],
          callToAction: result.data.callToAction || '',
          visualDirection: result.data.visualDirection || post.content.visualDirection,
          reimagined: true,
        };

        await authApiRequest(`api/v2/marketing/content/${post.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: updatedContent }),
        });

        setPosts(prev => prev.map((p, i) => i === postIndex ? { ...p, content: updatedContent } : p));
        setToast({ type: 'success', message: 'Post completely reimagined with a fresh approach.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk approve all draft posts (approve only, user schedules individually)
  const handleApproveAll = async () => {
    const draftPosts = posts.filter(p => p.status === 'draft');
    let successCount = 0;
    for (const post of draftPosts) {
      try {
        const result = await approveAndSchedule(post.id);
        if (result.success) {
          successCount++;
          setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'approved' } : p));
        }
      } catch {
        // continue with others
      }
    }
    setToast({
      type: successCount > 0 ? 'success' : 'error',
      message: successCount > 0
        ? `${successCount} post(s) approved. Open each to schedule.`
        : 'Failed to approve posts.',
    });
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const PlatformBadge = ({ channel }) => {
    const p = PLATFORMS[channel] || {};
    const iconPrefix = p.isCRM ? 'fa' : 'fab';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
        background: `${p.color || '#666'}15`, color: p.color || '#666',
      }}>
        <i className={`${iconPrefix} ${p.icon || 'fa-globe'}`}></i>
        {p.name || channel}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
      <span style={{
        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
        background: s.bg, color: s.color,
      }}>
        {s.label}
      </span>
    );
  };

  const MediaPreview = ({ content }) => {
    const matched = content.matchedMedia;
    const composition = content.composition;

    if (!matched) {
      return (
        <div style={{
          width: '100%', height: '180px', background: '#f8f9fa', borderRadius: '8px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#999', fontSize: '13px', border: '2px dashed #dee2e6',
        }}>
          <i className="fa fa-image" style={{ fontSize: '32px', marginBottom: '8px' }}></i>
          <span>No media matched</span>
          <span style={{ fontSize: '11px', marginTop: '2px' }}>Upload media to your library</span>
        </div>
      );
    }

    // Check if this image is being processed via pending_images pipeline
    const pendingId = composition?.pendingImageId;
    const pendingStatus = pendingId ? pendingStatuses[pendingId] : null;

    // Helper: ensure URLs are absolute (temp paths need API base prefix)
    const resolveUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      if (url.startsWith('/temp_images/') || url.startsWith('/api/')) {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        return apiBase ? `${apiBase}${url}` : url;
      }
      return url;
    };

    // Determine the best preview URL (priority order):
    // 1. Smart-serve URL from processed pending image
    // 2. Composed preview (locally edited image with overlays)
    // 3. Composed URL from pending status (for freshly composed images)
    // 4. Original matched media preview
    const processedUrl = pendingStatus?.permanentUrl || pendingStatus?.thumbnailUrl;
    const composedUrl = resolveUrl(pendingStatus?.composedUrl) || resolveUrl(composition?.composedPreviewUrl);
    const previewUrl = processedUrl || composedUrl || matched.thumbnailPath || matched.filePath;

    // Determine composition status
    let compositionStatus = composition?.status || 'none';
    // 'composed' means Sharp already produced the final image locally
    if (compositionStatus === 'composed') compositionStatus = 'completed';
    // If there's a pending image, check its status too
    if (pendingId && pendingStatus) {
      if (pendingStatus.status === 'pending') {
        // Show completed if we have a composed image, even if pending processing
        compositionStatus = composedUrl ? 'completed' : 'queued';
      }
      else if (pendingStatus.status === 'processed' || pendingStatus.status === 'complete') compositionStatus = 'completed';
      else if (pendingStatus.status === 'failed') compositionStatus = 'failed';
    }

    return (
      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Post media"
            style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: '100%', height: '180px', background: '#e9ecef',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`fa ${matched.type === 'video' ? 'fa-video' : 'fa-image'}`} style={{ fontSize: '32px', color: '#adb5bd' }}></i>
          </div>
        )}
        {/* Media source badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
        }}>
          {matched.type === 'video' ? 'Video' : 'Image'} &middot; {content.mediaSource === 'media_backend' ? 'AI Matched' : content.mediaSource === 'catalog' ? 'Product' : 'Library'}
        </div>
        {/* Composition status */}
        {compositionStatus !== 'none' && (
          <div style={{
            position: 'absolute', bottom: '8px', right: '8px',
            padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
            background: compositionStatus === 'queued' ? 'rgba(255,193,7,0.9)'
              : compositionStatus === 'completed' ? 'rgba(40,167,69,0.9)'
              : compositionStatus === 'failed' ? 'rgba(220,53,69,0.9)'
              : 'rgba(108,117,125,0.9)',
            color: compositionStatus === 'queued' ? '#000' : '#fff',
          }}>
            {compositionStatus === 'queued' ? 'Processing...'
              : compositionStatus === 'completed' ? 'Ready'
              : compositionStatus === 'failed' ? 'Failed'
              : compositionStatus}
          </div>
        )}
        {/* Match score */}
        {matched.score && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
          }}>
            {Math.round(matched.score * 100)}% match
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Loading/empty states
  // ---------------------------------------------------------------------------
  if (loading || !campaignId) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Campaign | Social Central</title></Head>
        <div className="loading-state"><div className="spinner"></div><span>Loading campaign...</span></div>
      </DashboardShell>
    );
  }

  if (!userData) return null;

  const draftCount = posts.filter(p => p.status === 'draft').length;
  const approvedCount = posts.filter(p => p.status === 'approved').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <>
      <Head><title>{campaign?.name || 'Campaign'} | Social Central | Brakebee</title></Head>
      <DashboardShell userData={userData}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <button
            onClick={() => router.push('/dashboard/marketing/social-central')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6c757d', padding: '4px' }}
          >
            <i className="fa fa-arrow-left"></i>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '22px' }}>{campaign?.name || 'Campaign'}</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
              Review AI-generated posts. Approve, revise, or reimagine each one.
            </p>
          </div>
          {draftCount > 0 && (
            <button
              onClick={handleApproveAll}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: '#28a745', color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <i className="fa fa-check-double"></i>
              Approve All ({draftCount})
            </button>
          )}
        </div>

        {/* Campaign stats bar */}
        <div style={{
          display: 'flex', gap: '16px', padding: '12px 16px', borderRadius: '8px',
          background: '#f8f9fa', marginBottom: '24px', flexWrap: 'wrap', fontSize: '13px',
        }}>
          <span><strong>{posts.length}</strong> posts</span>
          <span style={{ color: '#999' }}>|</span>
          <span style={{ color: '#856404' }}><i className="fa fa-clock" style={{ marginRight: '4px' }}></i> {draftCount} draft</span>
          <span style={{ color: '#155724' }}><i className="fa fa-check" style={{ marginRight: '4px' }}></i> {approvedCount} approved</span>
          {scheduledCount > 0 && (
            <span style={{ color: '#0c5460' }}><i className="fa fa-calendar-check" style={{ marginRight: '4px' }}></i> {scheduledCount} scheduled</span>
          )}
          {campaign?.start_date && (
            <>
              <span style={{ color: '#999' }}>|</span>
              <span>{campaign.start_date} — {campaign.end_date}</span>
            </>
          )}
        </div>

        {/* Empty state */}
        {posts.length === 0 && !loading && (
          <div className="section-box" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <i className="fa fa-magic" style={{ fontSize: '48px', color: '#dee2e6', marginBottom: '16px', display: 'block' }}></i>
            <h3 style={{ color: '#6c757d', marginBottom: '8px' }}>No posts generated yet</h3>
            <p style={{ color: '#adb5bd', fontSize: '14px' }}>This campaign has no AI-generated content. Go back and generate a campaign.</p>
          </div>
        )}

        {/* Post Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map((post, idx) => {
            const c = post.content || {};
            const isExpanded = expandedPost === post.id;
            const isActing = actionLoading === post.id;

            return (
              <div key={post.id} className="section-box" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="sc-post-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '200px' }}>

                  {/* Left: Media Preview */}
                  <div style={{ padding: '16px', background: '#fafafa', borderRight: '1px solid #eee' }}>
                    <MediaPreview content={c} />
                    {c.matchedMedia?.matchReason && (
                      <p style={{ fontSize: '11px', color: '#888', marginTop: '8px', lineHeight: '1.4' }}>
                        <i className="fa fa-search" style={{ marginRight: '4px' }}></i>
                        {c.matchedMedia.matchReason}
                      </p>
                    )}
                  </div>

                  {/* Right: Post Content */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>

                    {/* Top row: title + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: '#333' }}>
                        {c.title || `Post ${idx + 1}`}
                      </span>
                      <PlatformBadge channel={post.channel} />
                      <span style={{
                        padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                        background: '#e9ecef', color: '#555', textTransform: 'capitalize',
                      }}>
                        {post.type || 'post'}
                      </span>
                      <StatusBadge status={post.status} />
                      {c.suggestedDay && (
                        <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
                          <i className="fa fa-calendar" style={{ marginRight: '3px' }}></i>
                          Day {c.suggestedDay}{c.suggestedTime ? ` at ${c.suggestedTime}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Email Content (CRM) */}
                    {post.channel === 'email' ? (
                      <div style={{ flex: 1, marginBottom: '10px' }}>
                        {c.subjectLine && (
                          <div style={{
                            fontSize: '13px', fontWeight: 700, color: '#055474',
                            padding: '8px 12px', background: '#E8F4FD', borderRadius: '6px',
                            marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                          }}>
                            <i className="fa fa-envelope" style={{ fontSize: '12px' }}></i>
                            Subject: {c.subjectLine}
                          </div>
                        )}
                        {c.previewText && (
                          <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginBottom: '8px' }}>
                            Preview: {c.previewText}
                          </div>
                        )}
                        <div style={{
                          fontSize: '14px', color: '#333', lineHeight: '1.6',
                          maxHeight: isExpanded ? 'none' : '80px', overflow: 'hidden',
                          whiteSpace: 'pre-wrap',
                        }}>
                          {c.emailBody || c.caption || 'No email content generated.'}
                        </div>
                        {c.ctaButtonText && (
                          <div style={{
                            display: 'inline-block', marginTop: '10px',
                            padding: '8px 20px', background: '#055474', color: 'white',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                          }}>
                            {c.ctaButtonText}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Caption */}
                        <div style={{
                          fontSize: '14px', color: '#333', lineHeight: '1.6',
                          marginBottom: '10px', flex: 1,
                          maxHeight: isExpanded ? 'none' : '80px', overflow: 'hidden',
                        }}>
                          {c.caption || 'No caption generated.'}
                        </div>

                        {/* Hashtags */}
                        {c.hashtags?.length > 0 && (
                          <div style={{ marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {c.hashtags.slice(0, isExpanded ? 30 : 6).map((tag, i) => (
                              <span key={i} style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                                background: '#e8f4fd', color: '#0a6dc2',
                              }}>
                                #{tag}
                              </span>
                            ))}
                            {!isExpanded && c.hashtags.length > 6 && (
                              <span style={{ fontSize: '11px', color: '#888' }}>+{c.hashtags.length - 6} more</span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* CTA */}
                    {c.callToAction && post.channel !== 'email' && (
                      <div style={{ fontSize: '12px', color: '#6f42c1', fontWeight: 600, marginBottom: '8px' }}>
                        CTA: {c.callToAction}
                      </div>
                    )}

                    {/* Expanded: Visual direction + rationale */}
                    {isExpanded && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                        {c.visualDirection && (
                          <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px' }}>
                            <strong style={{ color: '#6f42c1' }}>Art Direction:</strong> {c.visualDirection}
                          </div>
                        )}
                        {c.rationale && (
                          <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px' }}>
                            <strong>Rationale:</strong> {c.rationale}
                          </div>
                        )}
                        {c.suggestedMediaDescription && (
                          <div style={{ fontSize: '12px', color: '#555' }}>
                            <strong>Suggested Media:</strong> {c.suggestedMediaDescription}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Scheduled info */}
                    {post.status === 'scheduled' && post.scheduled_at && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
                        background: '#d1ecf1', color: '#0c5460', marginBottom: '4px',
                      }}>
                        <i className="fa fa-calendar-check"></i>
                        Scheduled: {new Date(post.scheduled_at).toLocaleString()}
                      </div>
                    )}

                    {/* Action bar */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px',
                      paddingTop: '10px', borderTop: '1px solid #f0f0f0',
                    }}>
                      <button
                        onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                        style={smallBtnStyle('#6c757d')}
                      >
                        <i className={`fa fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                        {isExpanded ? 'Less' : 'More'}
                      </button>

                      {/* Draft posts: full action set */}
                      {post.status === 'draft' && (
                        <>
                          <button
                            onClick={() => openScheduleModal(post.id, idx)}
                            disabled={isActing}
                            style={smallBtnStyle('#28a745')}
                          >
                            {isActing ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span> : <i className="fa fa-check"></i>}
                            Approve &amp; Schedule
                          </button>
                          <button
                            onClick={() => { setReviseModal({ postId: post.id, postIndex: idx }); setReviseFeedback(''); }}
                            disabled={isActing}
                            style={smallBtnStyle('#fd7e14')}
                          >
                            <i className="fa fa-pen"></i> Revise
                          </button>
                          <button
                            onClick={() => handleReimagine(idx)}
                            disabled={isActing}
                            style={smallBtnStyle('#6f42c1')}
                          >
                            <i className="fa fa-wand-magic-sparkles"></i> Reimagine
                          </button>
                        </>
                      )}

                      {/* Approved but not yet scheduled — show schedule button */}
                      {post.status === 'approved' && (
                        <button
                          onClick={() => openScheduleModal(post.id, idx)}
                          disabled={isActing}
                          style={smallBtnStyle('#17a2b8')}
                        >
                          <i className="fa fa-clock"></i> Schedule
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revise Modal */}
        {reviseModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setReviseModal(null)}>
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
                <i className="fa fa-pen" style={{ marginRight: '8px', color: '#fd7e14' }}></i>
                Revise Post
              </h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                Tell Claude what to change. Be specific — e.g. &quot;Make it more playful&quot; or &quot;Focus on the spring collection.&quot;
              </p>
              <textarea
                value={reviseFeedback}
                onChange={(e) => setReviseFeedback(e.target.value)}
                placeholder="Your feedback for the AI..."
                style={{
                  width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px',
                  border: '1px solid #dee2e6', fontSize: '14px', resize: 'vertical',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={() => setReviseModal(null)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #dee2e6', background: '#fff', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRevise(reviseModal.postIndex)}
                  disabled={!reviseFeedback.trim() || actionLoading}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: reviseFeedback.trim() ? '#fd7e14' : '#dee2e6',
                    color: '#fff', cursor: reviseFeedback.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '13px', fontWeight: 600,
                  }}
                >
                  {actionLoading ? 'Revising...' : 'Send to AI'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scheduling Modal */}
        {scheduleModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setScheduleModal(null)}>
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '28px', width: '480px', maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }} onClick={(e) => e.stopPropagation()}>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>
                <i className="fa fa-calendar-check" style={{ marginRight: '8px', color: '#17a2b8' }}></i>
                Schedule Post
              </h3>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 20px 0' }}>
                Choose when to publish or use the AI-recommended time.
              </p>

              {/* AI Suggestion */}
              <div style={{
                padding: '14px 16px', borderRadius: '8px', marginBottom: '20px',
                background: aiSugLoading ? '#f8f9fa' : (aiSuggestion ? '#e8f4fd' : '#f8f9fa'),
                border: `1px solid ${aiSuggestion ? '#bee5eb' : '#e9ecef'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: aiSuggestion ? '8px' : 0 }}>
                  <i className="fa fa-robot" style={{ color: '#6f42c1' }}></i>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#333' }}>Leo AI Suggestion</span>
                  {aiSugLoading && (
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, marginRight: 4, verticalAlign: 'middle' }}></span>
                      Analyzing best posting time...
                    </span>
                  )}
                </div>

                {aiSuggestion && !aiSugLoading && (
                  <>
                    <div style={{ fontSize: '14px', color: '#333', fontWeight: 600, marginBottom: '4px' }}>
                      <i className="fa fa-clock" style={{ marginRight: '6px', color: '#17a2b8' }}></i>
                      {aiSuggestion.suggestedDay || 'Weekday'} at {aiSuggestion.suggestedTime || '10:00 AM'}
                    </div>
                    {aiSuggestion.rationale && (
                      <p style={{ fontSize: '12px', color: '#666', margin: '6px 0 0 0', lineHeight: '1.5' }}>
                        {aiSuggestion.rationale}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        const sug = parseSuggestion(aiSuggestion);
                        setScheduleDate(sug.date);
                        setScheduleTime(sug.time);
                      }}
                      style={{
                        marginTop: '8px', padding: '6px 14px', borderRadius: '6px', fontSize: '12px',
                        fontWeight: 600, border: '1px solid #17a2b8', background: '#17a2b8',
                        color: '#fff', cursor: 'pointer',
                      }}
                    >
                      <i className="fa fa-magic" style={{ marginRight: '4px' }}></i>
                      Use This Time
                    </button>
                  </>
                )}

                {!aiSuggestion && !aiSugLoading && (
                  <span style={{ fontSize: '12px', color: '#999' }}>No AI suggestion available — pick a time manually.</span>
                )}
              </div>

              {/* Date & Time Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #dee2e6', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #dee2e6', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Preview */}
              {scheduleDate && scheduleTime && (
                <div style={{
                  padding: '10px 14px', borderRadius: '6px', fontSize: '13px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
                  marginBottom: '20px',
                }}>
                  <i className="fa fa-check-circle" style={{ marginRight: '6px' }}></i>
                  Will publish on <strong>{new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleString()}</strong>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => handleApproveOnly(scheduleModal.postId)}
                  disabled={actionLoading}
                  style={{
                    padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                    border: '1px solid #dee2e6', background: '#fff', color: '#555', cursor: 'pointer',
                  }}
                >
                  Approve Only (schedule later)
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setScheduleModal(null)}
                    style={{
                      padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                      border: '1px solid #dee2e6', background: '#fff', color: '#555', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSchedule}
                    disabled={!scheduleDate || !scheduleTime || actionLoading}
                    style={{
                      padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      border: 'none', cursor: (scheduleDate && scheduleTime) ? 'pointer' : 'not-allowed',
                      background: (scheduleDate && scheduleTime) ? '#28a745' : '#dee2e6',
                      color: '#fff',
                    }}
                  >
                    {actionLoading ? 'Scheduling...' : 'Approve & Schedule'}
                  </button>
                </div>
              </div>
            </div>
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
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontSize: '14px', fontWeight: 500,
          }}>
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
            {toast.message}
          </div>
        )}

      </DashboardShell>
    </>
  );
}

// Small action button style helper
const smallBtnStyle = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
  border: `1px solid ${color}30`, background: `${color}08`, color,
  cursor: 'pointer', transition: 'all 0.15s ease',
});
