/**
 * Social Central - Build-a-Post (Manual Post Creator)
 * Dashboard > Marketing > Social Central > Post
 *
 * Users build a single post manually:
 *   1. Pick platform + post type
 *   2. Write or AI-generate a caption
 *   3. Select media from library or upload
 *   4. Preview the assembled post
 *   5. Approve & schedule via the same scheduling flow
 *
 * AI assists: auto-caption, hashtag suggestions, time recommendation.
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../lib/users/api';
import {
  fetchConnections,
  fetchAssets,
  generateCaption,
  suggestPostingTime,
  approveAndSchedule,
  PLATFORMS,
} from '../../../../lib/social-central/api';

// Character limits per platform
const CHAR_LIMITS = {
  facebook:  63206,
  instagram: 2200,
  twitter:   280,
  tiktok:    2200,
  pinterest: 500,
};

const POST_TYPES = [
  { value: 'post',    label: 'Feed Post',  icon: 'fa-image' },
  { value: 'reel',    label: 'Reel/Short', icon: 'fa-film' },
  { value: 'story',   label: 'Story',      icon: 'fa-clock' },
  { value: 'carousel',label: 'Carousel',   icon: 'fa-images' },
];

export default function BuildAPostPage() {
  const router = useRouter();

  // Auth & data
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [libraryAssets, setLibraryAssets] = useState([]);

  // Form state
  const [platform, setPlatform] = useState('');
  const [postType, setPostType] = useState('post');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);   // asset object
  const [showLibrary, setShowLibrary] = useState(false);
  const [mediaFilter, setMediaFilter] = useState('all');

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState('engaging');
  const [aiGoal, setAiGoal] = useState('');
  const [aiNotes, setAiNotes] = useState('');

  // Scheduling
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiSugLoading, setAiSugLoading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // ---------------------------------------------------------------------------
  // Load user, connections, library
  // ---------------------------------------------------------------------------
  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if (userData) { loadConnections(); loadLibrary(); } }, [userData]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); } }, [toast]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      if (!data?.permissions?.includes('leo_social')) { router.push('/dashboard/marketing'); return; }
      setUserData(data);
    } catch { router.push('/login?redirect=/dashboard/marketing/social-central/post'); }
    finally { setLoading(false); }
  };

  const loadConnections = async () => {
    try {
      const data = await fetchConnections();
      if (data.success) setConnections((data.connections || []).filter(c => c.status === 'active'));
    } catch {}
  };

  const loadLibrary = async () => {
    try {
      const data = await fetchAssets();
      if (data.success) setLibraryAssets(data.assets || []);
    } catch {}
  };

  // ---------------------------------------------------------------------------
  // Caption character count
  // ---------------------------------------------------------------------------
  const charLimit = CHAR_LIMITS[platform] || 2200;
  const charCount = caption.length;
  const charPercent = Math.min((charCount / charLimit) * 100, 100);
  const charColor = charPercent > 95 ? '#dc3545' : charPercent > 80 ? '#fd7e14' : '#28a745';

  // ---------------------------------------------------------------------------
  // Hashtag management
  // ---------------------------------------------------------------------------
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
    }
    setHashtagInput('');
  };

  const removeHashtag = (tag) => setHashtags(prev => prev.filter(t => t !== tag));

  // ---------------------------------------------------------------------------
  // AI Caption Generation
  // ---------------------------------------------------------------------------
  const handleAICaption = async () => {
    if (!platform) {
      setToast({ type: 'error', message: 'Select a platform first.' });
      return;
    }

    setAiLoading(true);
    try {
      const params = {
        platform,
        tone: aiTone,
        goal: aiGoal || undefined,
        additionalNotes: aiNotes || undefined,
        mediaDescription: selectedMedia
          ? `${selectedMedia.type} asset: ${selectedMedia.tags?.join(', ') || selectedMedia.original_filename || 'uploaded media'}`
          : undefined,
      };

      const result = await generateCaption(params);
      if (result.success && result.data) {
        setCaption(result.data.caption || '');
        if (result.data.hashtags?.length) setHashtags(result.data.hashtags);
        if (result.data.callToAction) setCallToAction(result.data.callToAction);
        setToast({ type: 'success', message: 'AI caption generated! Feel free to edit.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'AI generation failed.' });
    } finally {
      setAiLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Create content record & open scheduling
  // ---------------------------------------------------------------------------
  const handlePublish = async () => {
    if (!platform) { setToast({ type: 'error', message: 'Select a platform.' }); return; }
    if (!caption.trim()) { setToast({ type: 'error', message: 'Write or generate a caption.' }); return; }

    setSubmitting(true);
    try {
      // 1. Create a content record (draft)
      const contentPayload = {
        caption: caption.trim(),
        hashtags,
        callToAction: callToAction.trim() || undefined,
        mediaAssetId: selectedMedia?.id || null,
      };

      const res = await authApiRequest('api/v2/marketing/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: postType,
          channel: platform,
          content: contentPayload,
          status: 'draft',
          created_by: 'manual',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create post.');

      const contentId = data.content?.id || data.id;

      // 2. Open scheduling modal
      setScheduleModal(contentId);
      setScheduleDate('');
      setScheduleTime('');
      setAiSuggestion(null);

      // Fetch AI suggestion in background
      setAiSugLoading(true);
      suggestPostingTime({ platform, contentType: postType, caption: caption.trim() })
        .then(result => {
          if (result.success && result.data) {
            setAiSuggestion(result.data);
            const sug = parseSuggestion(result.data);
            setScheduleDate(sug.date);
            setScheduleTime(sug.time);
          }
        })
        .catch(() => {})
        .finally(() => setAiSugLoading(false));

    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Schedule helpers (same logic as post queue)
  // ---------------------------------------------------------------------------
  const parseSuggestion = (sug) => {
    const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const now = new Date();
    let targetDate = new Date(now);
    if (sug.suggestedDay && dayMap[sug.suggestedDay] !== undefined) {
      const diff = (dayMap[sug.suggestedDay] - now.getDay() + 7) % 7 || 7;
      targetDate.setDate(now.getDate() + diff);
    } else {
      targetDate.setDate(now.getDate() + 1);
    }
    let hours = 10, minutes = 0;
    if (sug.suggestedTime) {
      const match = sug.suggestedTime.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2] || '0', 10);
        if (match[3]?.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (match[3]?.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
    }
    return {
      date: targetDate.toISOString().split('T')[0],
      time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleDate || !scheduleTime) { setToast({ type: 'error', message: 'Pick a date and time.' }); return; }
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    setSubmitting(true);
    try {
      const result = await approveAndSchedule(scheduleModal, scheduledAt);
      if (result.success) {
        setToast({ type: 'success', message: `Post scheduled for ${new Date(scheduledAt).toLocaleString()}!` });
        setScheduleModal(false);
        // Reset form
        setTimeout(() => router.push('/dashboard/marketing/social-central'), 1500);
      } else {
        setToast({ type: 'error', message: result.error || 'Scheduling failed.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOnly = async () => {
    setSubmitting(true);
    try {
      const result = await approveAndSchedule(scheduleModal);
      if (result.success) {
        setToast({ type: 'success', message: 'Post approved! You can schedule it later from your campaign queue.' });
        setScheduleModal(false);
        setTimeout(() => router.push('/dashboard/marketing/social-central'), 1500);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered library
  // ---------------------------------------------------------------------------
  const filteredAssets = libraryAssets.filter(a =>
    mediaFilter === 'all' || a.type === mediaFilter
  );

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Create Post | Social Central | Brakebee</title></Head>
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
      <Head><title>Create Post | Social Central | Brakebee</title></Head>
      <DashboardShell userData={userData}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <button onClick={() => router.push('/dashboard/marketing/social-central')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6c757d' }}>
            <i className="fa fa-arrow-left"></i>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px' }}>Build a Post</h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#888' }}>Create, preview, and schedule a single post with AI assistance</p>
          </div>
        </div>

        <div className="sc-composer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', marginTop: '20px', alignItems: 'start' }}>

          {/* ============== LEFT: Editor ============== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Platform + Type */}
            <div className="section-box" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>
                <i className="fa fa-share-nodes" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                Platform &amp; Type
              </h3>

              {connections.length === 0 ? (
                <div style={{ padding: '16px', background: '#fff3cd', borderRadius: '8px', fontSize: '13px', color: '#856404' }}>
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                  No connected accounts. <a href="/dashboard/marketing/social-central/connections" style={{ fontWeight: 600 }}>Connect one first</a>.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {connections.map(conn => {
                      const p = PLATFORMS[conn.platform] || {};
                      const selected = platform === conn.platform;
                      return (
                        <button key={conn.id}
                          onClick={() => setPlatform(conn.platform)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                            border: selected ? `2px solid ${p.color || '#333'}` : '2px solid #e9ecef',
                            background: selected ? `${p.color || '#333'}10` : '#fff',
                            color: selected ? (p.color || '#333') : '#555',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                          }}
                        >
                          <i className={`fab ${p.icon || 'fa-link'}`}></i>
                          {p.name || conn.platform}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {POST_TYPES.map(pt => (
                      <button key={pt.value}
                        onClick={() => setPostType(pt.value)}
                        style={{
                          padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                          border: postType === pt.value ? '1px solid var(--primary-color)' : '1px solid #dee2e6',
                          background: postType === pt.value ? 'var(--primary-color)' : '#fff',
                          color: postType === pt.value ? '#fff' : '#555',
                          cursor: 'pointer',
                        }}
                      >
                        <i className={`fa ${pt.icon}`} style={{ marginRight: '4px' }}></i> {pt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Caption */}
            <div className="section-box" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>
                  <i className="fa fa-pencil" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                  Caption
                </h3>
                <span style={{ fontSize: '12px', color: charColor, fontWeight: 600 }}>
                  {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                </span>
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your post caption here or use AI to generate one..."
                maxLength={charLimit}
                rows={6}
                style={{
                  width: '100%', padding: '14px', borderRadius: '8px',
                  border: '1px solid #dee2e6', fontSize: '14px', lineHeight: '1.6',
                  resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />

              {/* Character bar */}
              <div style={{ height: '3px', background: '#e9ecef', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${charPercent}%`, background: charColor, borderRadius: '2px', transition: 'width 0.2s ease' }} />
              </div>

              {/* Hashtags */}
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px', display: 'block' }}>
                  Hashtags
                </label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                    placeholder="Add hashtag..."
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '6px',
                      border: '1px solid #dee2e6', fontSize: '13px',
                    }}
                  />
                  <button onClick={addHashtag} style={{
                    padding: '8px 14px', borderRadius: '6px', border: 'none',
                    background: 'var(--primary-color)', color: '#fff', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer',
                  }}>
                    Add
                  </button>
                </div>
                {hashtags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {hashtags.map((tag, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '10px', fontSize: '12px',
                        background: '#e8f4fd', color: '#0a6dc2',
                      }}>
                        #{tag}
                        <button onClick={() => removeHashtag(tag)} style={{
                          background: 'none', border: 'none', color: '#0a6dc2', cursor: 'pointer',
                          fontSize: '14px', padding: 0, lineHeight: 1,
                        }}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px', display: 'block' }}>
                  Call to Action <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  placeholder='e.g. "Shop Now", "Link in Bio", "Swipe Up"'
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '6px',
                    border: '1px solid #dee2e6', fontSize: '13px', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* AI Assist Panel */}
            <div className="section-box" style={{ padding: '20px', background: 'linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 100%)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>
                <i className="fa fa-robot" style={{ marginRight: '8px', color: '#6f42c1' }}></i>
                AI Caption Assistant
              </h3>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '14px', lineHeight: '1.5' }}>
                Claude generates a caption using your brand context from Leo. Pick a tone and optionally describe your goal.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#555', display: 'block', marginBottom: '3px' }}>Tone</label>
                  <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} style={{
                    width: '100%', padding: '8px 10px', borderRadius: '6px',
                    border: '1px solid #dee2e6', fontSize: '13px', background: '#fff',
                  }}>
                    <option value="engaging">Engaging</option>
                    <option value="professional">Professional</option>
                    <option value="playful">Playful</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="educational">Educational</option>
                    <option value="humorous">Humorous</option>
                    <option value="urgent">Urgent / FOMO</option>
                    <option value="storytelling">Storytelling</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#555', display: 'block', marginBottom: '3px' }}>Goal</label>
                  <select value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} style={{
                    width: '100%', padding: '8px 10px', borderRadius: '6px',
                    border: '1px solid #dee2e6', fontSize: '13px', background: '#fff',
                  }}>
                    <option value="">General</option>
                    <option value="awareness">Brand Awareness</option>
                    <option value="engagement">Drive Engagement</option>
                    <option value="traffic">Drive Traffic</option>
                    <option value="sales">Drive Sales</option>
                    <option value="followers">Grow Followers</option>
                    <option value="event">Promote Event</option>
                    <option value="product_launch">Product Launch</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                placeholder="Any extra context? e.g. 'Focus on spring collection', 'Mention free shipping'"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid #dee2e6', fontSize: '13px', marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />

              <button
                onClick={handleAICaption}
                disabled={aiLoading || !platform}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: aiLoading ? '#b8a9d4' : '#6f42c1', color: '#fff',
                  fontSize: '14px', fontWeight: 600, cursor: aiLoading ? 'wait' : 'pointer',
                  width: '100%', justifyContent: 'center',
                }}
              >
                {aiLoading ? (
                  <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Generating...</>
                ) : (
                  <><i className="fa fa-magic"></i> Generate AI Caption</>
                )}
              </button>
            </div>

            {/* Media Selection */}
            <div className="section-box" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>
                <i className="fa fa-photo-video" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                Media
              </h3>

              {selectedMedia ? (
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden',
                    background: '#f8f9fa', position: 'relative',
                  }}>
                    {selectedMedia.type === 'image' ? (
                      <img
                        src={selectedMedia.url || selectedMedia.file_path}
                        alt={selectedMedia.original_filename || 'Selected media'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : selectedMedia.type === 'video' ? (
                      <video
                        src={selectedMedia.url || selectedMedia.file_path}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        controls
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <i className="fa fa-file" style={{ fontSize: '48px', color: '#adb5bd' }}></i>
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: '8px', fontSize: '12px', color: '#555',
                  }}>
                    <span>{selectedMedia.original_filename || 'Media asset'}</span>
                    <button
                      onClick={() => setSelectedMedia(null)}
                      style={{
                        background: 'none', border: '1px solid #dc3545', color: '#dc3545',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <i className="fa fa-times" style={{ marginRight: '4px' }}></i> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLibrary(true)}
                  style={{
                    width: '100%', padding: '30px', borderRadius: '8px',
                    border: '2px dashed #dee2e6', background: '#fafafa',
                    cursor: 'pointer', fontSize: '14px', color: '#888',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#888'; }}
                >
                  <i className="fa fa-cloud-upload-alt" style={{ fontSize: '28px' }}></i>
                  <span style={{ fontWeight: 600 }}>Select from Media Library</span>
                  <span style={{ fontSize: '12px' }}>Choose an image or video for your post</span>
                </button>
              )}
            </div>
          </div>

          {/* ============== RIGHT: Preview + Actions ============== */}
          <div className="sc-composer-preview" style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Live Preview */}
            <div className="section-box" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>
                <i className="fa fa-eye" style={{ marginRight: '8px', color: '#17a2b8' }}></i>
                Preview
              </h3>

              {/* Platform header */}
              {platform && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
                  paddingBottom: '10px', borderBottom: '1px solid #eee',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: (PLATFORMS[platform]?.color || '#333') + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`fab ${PLATFORMS[platform]?.icon || 'fa-link'}`} style={{ color: PLATFORMS[platform]?.color || '#333', fontSize: '14px' }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{userData?.store_name || userData?.name || 'Your Brand'}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{PLATFORMS[platform]?.name} &middot; {POST_TYPES.find(t => t.value === postType)?.label}</div>
                  </div>
                </div>
              )}

              {/* Media preview */}
              {selectedMedia ? (
                <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', background: '#f8f9fa', marginBottom: '12px' }}>
                  {selectedMedia.type === 'image' ? (
                    <img src={selectedMedia.url || selectedMedia.file_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
                      <i className="fa fa-play-circle" style={{ fontSize: '48px', color: '#fff' }}></i>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  width: '100%', height: '160px', borderRadius: '8px', background: '#f8f9fa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '12px', border: '1px dashed #dee2e6',
                }}>
                  <span style={{ fontSize: '12px', color: '#adb5bd' }}>No media selected</span>
                </div>
              )}

              {/* Caption preview */}
              <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6', marginBottom: '8px', wordBreak: 'break-word' }}>
                {caption || <span style={{ color: '#ccc', fontStyle: 'italic' }}>Your caption will appear here...</span>}
              </div>

              {/* Hashtags preview */}
              {hashtags.length > 0 && (
                <div style={{ fontSize: '12px', color: '#0a6dc2', lineHeight: '1.6', marginBottom: '8px' }}>
                  {hashtags.map(t => `#${t}`).join(' ')}
                </div>
              )}

              {/* CTA preview */}
              {callToAction && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6f42c1', marginTop: '4px' }}>
                  {callToAction}
                </div>
              )}

              {/* Empty state */}
              {!platform && !caption && (
                <p style={{ fontSize: '12px', color: '#adb5bd', textAlign: 'center', margin: '20px 0' }}>
                  Start building your post to see a live preview.
                </p>
              )}
            </div>

            {/* Publish Button */}
            <button
              onClick={handlePublish}
              disabled={submitting || !platform || !caption.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '14px 20px', borderRadius: '10px', border: 'none',
                background: (platform && caption.trim()) ? '#28a745' : '#dee2e6',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                cursor: (platform && caption.trim()) ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              {submitting ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Creating...</>
              ) : (
                <><i className="fa fa-paper-plane"></i> Create &amp; Schedule</>
              )}
            </button>

            <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', margin: 0 }}>
              A scheduling modal will appear after creation.
            </p>
          </div>
        </div>

        {/* ============== Media Library Picker Modal ============== */}
        {showLibrary && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setShowLibrary(false)}>
            <div style={{
              background: '#fff', borderRadius: '14px', width: '720px', maxWidth: '95vw',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '17px' }}>
                  <i className="fa fa-photo-video" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                  Select Media
                </h3>
                <button onClick={() => setShowLibrary(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#adb5bd', cursor: 'pointer' }}>&times;</button>
              </div>

              {/* Filter bar */}
              <div style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '6px' }}>
                {['all', 'image', 'video'].map(f => (
                  <button key={f}
                    onClick={() => setMediaFilter(f)}
                    style={{
                      padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 600,
                      border: mediaFilter === f ? '1px solid var(--primary-color)' : '1px solid #dee2e6',
                      background: mediaFilter === f ? 'var(--primary-color)' : '#fff',
                      color: mediaFilter === f ? '#fff' : '#555',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >{f === 'all' ? 'All Media' : f + 's'}</button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                  {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                {filteredAssets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#adb5bd' }}>
                    <i className="fa fa-inbox" style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}></i>
                    <p style={{ fontSize: '14px' }}>No media assets found.</p>
                    <a href="/dashboard/marketing/social-central/library" style={{ fontSize: '13px', color: 'var(--primary-color)' }}>
                      Go to Media Library to upload
                    </a>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                    {filteredAssets.map(asset => (
                      <div key={asset.id}
                        onClick={() => { setSelectedMedia(asset); setShowLibrary(false); }}
                        style={{
                          borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                          border: selectedMedia?.id === asset.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                          transition: 'border 0.15s ease, transform 0.15s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <div style={{ width: '100%', height: '110px', background: '#f8f9fa', position: 'relative' }}>
                          {asset.type === 'image' ? (
                            <img src={asset.thumbnail_url || asset.url || asset.file_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : asset.type === 'video' ? (
                            <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fa fa-play-circle" style={{ color: '#fff', fontSize: '28px' }}></i>
                            </div>
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fa fa-file" style={{ color: '#adb5bd', fontSize: '28px' }}></i>
                            </div>
                          )}
                          <span style={{
                            position: 'absolute', top: '4px', right: '4px',
                            background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px',
                            padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700,
                          }}>{asset.type}</span>
                        </div>
                        <div style={{ padding: '6px 8px', fontSize: '11px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {asset.original_filename || `Asset #${asset.id}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============== Scheduling Modal ============== */}
        {scheduleModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setScheduleModal(false)}>
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '28px', width: '480px', maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }} onClick={(e) => e.stopPropagation()}>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>
                <i className="fa fa-calendar-check" style={{ marginRight: '8px', color: '#17a2b8' }}></i>
                Schedule Post
              </h3>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 20px 0' }}>
                Post created! Choose when to publish or use the AI-recommended time.
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
                      Analyzing best time...
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
                    <button onClick={() => { const s = parseSuggestion(aiSuggestion); setScheduleDate(s.date); setScheduleTime(s.time); }}
                      style={{ marginTop: '8px', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #17a2b8', background: '#17a2b8', color: '#fff', cursor: 'pointer' }}>
                      <i className="fa fa-magic" style={{ marginRight: '4px' }}></i> Use This Time
                    </button>
                  </>
                )}
                {!aiSuggestion && !aiSugLoading && (
                  <span style={{ fontSize: '12px', color: '#999' }}>No AI suggestion — pick a time manually.</span>
                )}
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Date</label>
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dee2e6', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Time</label>
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dee2e6', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {scheduleDate && scheduleTime && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '13px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '20px' }}>
                  <i className="fa fa-check-circle" style={{ marginRight: '6px' }}></i>
                  Will publish on <strong>{new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleString()}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleApproveOnly} disabled={submitting}
                  style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid #dee2e6', background: '#fff', color: '#555', cursor: 'pointer' }}>
                  Approve Only
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setScheduleModal(false)}
                    style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid #dee2e6', background: '#fff', color: '#555', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleConfirmSchedule} disabled={!scheduleDate || !scheduleTime || submitting}
                    style={{
                      padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none',
                      background: (scheduleDate && scheduleTime) ? '#28a745' : '#dee2e6', color: '#fff',
                      cursor: (scheduleDate && scheduleTime) ? 'pointer' : 'not-allowed',
                    }}>
                    {submitting ? 'Scheduling...' : 'Schedule Post'}
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
