import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';
import { authApiRequest } from '../../../lib/apiUtils';

const BlockEditor = dynamic(() => import('../../../modules/shared/block-editor'), {
  ssr: false,
  loading: () => <div className="loading-state"><div className="spinner"></div><span>Loading editor...</span></div>
});

const MAGAZINE_LABELS = {
  'artist-news': 'Artist News',
  'promoter-news': 'Promoter News',
  'community-news': 'Community News',
};

const CONTENT_TYPES = [
  { value: 'how-to', label: 'How-To Guide' },
  { value: 'faq', label: 'FAQ' },
  { value: 'listicle', label: 'Listicle' },
  { value: 'pillar', label: 'Pillar Content' },
  { value: 'news', label: 'News / Trends' },
  { value: 'spotlight', label: 'Spotlight' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'roundup', label: 'Roundup' },
];

const SEARCH_INTENTS = [
  { value: 'informational', label: 'Informational' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'navigational', label: 'Navigational' },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiFetch(endpoint, options = {}) {
  const res = await authApiRequest(`api/v2/marketing/${endpoint}`, options);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AutoBlogPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');

  useEffect(() => {
    getCurrentUser()
      .then(setUserData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardShell><div className="loading-state"><div className="spinner"></div><p>Loading...</p></div></DashboardShell>;
  }
  if (error) {
    return <DashboardShell><div className="error-alert">Error: {error}</div></DashboardShell>;
  }
  if (!checkIsAdmin(userData)) {
    return <DashboardShell><div className="error-alert">Admin access required</div></DashboardShell>;
  }

  return (
    <DashboardShell>
      <Head>
        <title>Auto-Blog | System | Brakebee</title>
      </Head>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              <i className="fas fa-robot" style={{ marginRight: '0.5rem', opacity: 0.7 }}></i>
              Auto-Blog
            </h1>
            <p style={{ margin: '0.25rem 0 0', opacity: 0.7 }}>AI-generated articles across your magazines</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-color, #dee2e6)', marginBottom: '1.5rem' }}>
          {[{ id: 'queue', label: 'Queue', icon: 'fa-list' }, { id: 'settings', label: 'Settings', icon: 'fa-cog' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? 'var(--primary, #3e1c56)' : 'inherit',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary, #3e1c56)' : '2px solid transparent',
                marginBottom: '-2px',
                fontSize: '0.95rem',
              }}
            >
              <i className={`fas ${tab.icon}`} style={{ marginRight: '0.5rem' }}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'queue' && <QueueTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// Queue Tab
// ---------------------------------------------------------------------------

function QueueTab() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterMagazine, setFilterMagazine] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchQueue = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let endpoint = `auto-blog/queue?page=${page}&limit=20`;
      if (filterMagazine) endpoint += `&magazine=${filterMagazine}`;
      if (filterStatus) endpoint += `&status=${filterStatus}`;
      const data = await apiFetch(endpoint);
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0 });
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  }, [filterMagazine, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch('auto-blog/stats');
      setStats(data.stats);
    } catch { /* stats are non-critical */ }
  }, []);

  useEffect(() => { fetchQueue(); fetchStats(); }, [fetchQueue, fetchStats]);

  const handlePublish = async (jobId) => {
    if (!confirm('Publish this article and generate social drafts?')) return;
    setActionLoading(jobId);
    try {
      const data = await apiFetch(`auto-blog/publish/${jobId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      alert(`Published! ${data.socialDraftsCreated} social draft(s) created.`);
      fetchQueue(pagination.page);
      fetchStats();
    } catch (err) {
      alert('Publish failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (jobId) => {
    if (!confirm('Reject this article? It will be archived.')) return;
    setActionLoading(jobId);
    try {
      await apiFetch(`auto-blog/reject/${jobId}`, { method: 'POST' });
      fetchQueue(pagination.page);
      fetchStats();
    } catch (err) {
      alert('Reject failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status) => {
    const colors = {
      generated: { bg: '#fff3cd', color: '#856404' },
      published: { bg: '#d4edda', color: '#155724' },
      failed: { bg: '#f8d7da', color: '#721c24' },
      rejected: { bg: '#e2e3e5', color: '#383d41' },
      pending: { bg: '#cce5ff', color: '#004085' },
      generating: { bg: '#d1ecf1', color: '#0c5460' },
    };
    const c = colors[status] || colors.pending;
    return (
      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.color }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Pending Review', value: stats.pendingReview, icon: 'fa-clock', color: '#856404' },
            { label: 'Published', value: stats.published, icon: 'fa-check-circle', color: '#155724' },
            { label: 'This Week', value: stats.thisWeek, icon: 'fa-calendar-week', color: '#004085' },
            { label: 'This Month', value: stats.thisMonth, icon: 'fa-calendar-alt', color: '#3e1c56' },
            { label: 'Failed', value: stats.failed, icon: 'fa-exclamation-triangle', color: '#721c24' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color, #dee2e6)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: '1.2rem' }}></i>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select value={filterMagazine} onChange={e => setFilterMagazine(e.target.value)} style={selectStyle}>
          <option value="">All Magazines</option>
          {Object.entries(MAGAZINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="generated">Pending Review</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Queue table */}
      {loading ? (
        <div className="loading-state"><div className="spinner"></div><p>Loading queue...</p></div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
          <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
          No articles in queue. Enable a magazine config and generate articles to get started.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color, #dee2e6)', textAlign: 'left' }}>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Magazine</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Words</th>
                <th style={thStyle}>Generated</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <QueueRow
                  key={item.job_id}
                  item={item}
                  expanded={expandedId === item.job_id}
                  onToggle={() => setExpandedId(expandedId === item.job_id ? null : item.job_id)}
                  onPublish={() => handlePublish(item.job_id)}
                  onReject={() => handleReject(item.job_id)}
                  actionLoading={actionLoading}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchQueue(p)}
              style={{
                padding: '0.4rem 0.75rem',
                border: '1px solid var(--border-color, #dee2e6)',
                borderRadius: '4px',
                background: p === pagination.page ? 'var(--primary, #3e1c56)' : 'transparent',
                color: p === pagination.page ? '#fff' : 'inherit',
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Queue Row with inline editor
// ---------------------------------------------------------------------------

function QueueRow({ item, expanded, onToggle, onPublish, onReject, actionLoading }) {
  const isLoading = actionLoading === item.job_id;
  const canAct = item.job_status === 'generated';

  const statusBadge = (status) => {
    const colors = {
      generated: { bg: '#fff3cd', color: '#856404' },
      published: { bg: '#d4edda', color: '#155724' },
      failed: { bg: '#f8d7da', color: '#721c24' },
      rejected: { bg: '#e2e3e5', color: '#383d41' },
      pending: { bg: '#cce5ff', color: '#004085' },
      generating: { bg: '#d1ecf1', color: '#0c5460' },
    };
    const c = colors[status] || colors.pending;
    return (
      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: c.bg, color: c.color }}>
        {status}
      </span>
    );
  };

  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderBottom: '1px solid var(--border-color, #dee2e6)', cursor: 'pointer', background: expanded ? 'var(--card-bg, #f8f9fa)' : 'transparent' }}
      >
        <td style={tdStyle}>
          <div style={{ fontWeight: 600 }}>{item.title || 'Untitled'}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{item.topic_used}</div>
        </td>
        <td style={tdStyle}>{MAGAZINE_LABELS[item.magazine] || item.magazine}</td>
        <td style={tdStyle}>
          <span style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem', background: 'var(--card-bg, #f0f0f0)', borderRadius: '4px' }}>
            {item.content_type_used || '—'}
          </span>
        </td>
        <td style={tdStyle}>{item.word_count || '—'}</td>
        <td style={tdStyle}>{item.generated_at ? new Date(item.generated_at).toLocaleDateString() : '—'}</td>
        <td style={tdStyle}>{statusBadge(item.job_status)}</td>
        <td style={tdStyle} onClick={e => e.stopPropagation()}>
          {canAct && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onPublish} disabled={isLoading} style={{ ...btnSmall, background: '#198754', color: '#fff' }}>
                {isLoading ? '...' : 'Publish'}
              </button>
              <button onClick={onReject} disabled={isLoading} style={{ ...btnSmall, background: '#dc3545', color: '#fff' }}>
                Reject
              </button>
            </div>
          )}
        </td>
      </tr>
      {expanded && item.content && (
        <tr>
          <td colSpan={7} style={{ padding: '1rem', background: 'var(--card-bg, #f8f9fa)', borderBottom: '2px solid var(--border-color, #dee2e6)' }}>
            <InlineEditor item={item} />
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline Editor (BlockEditor embedded)
// ---------------------------------------------------------------------------

function InlineEditor({ item }) {
  const [articleContent, setArticleContent] = useState(null);

  useEffect(() => {
    if (!item.content) return;
    try {
      const parsed = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
      setArticleContent(parsed);
    } catch {
      setArticleContent(null);
    }
  }, [item.content]);

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.25rem' }}>{item.title}</h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', opacity: 0.7, flexWrap: 'wrap' }}>
          <span><strong>Magazine:</strong> {MAGAZINE_LABELS[item.magazine]}</span>
          <span><strong>Type:</strong> {item.content_type_used}</span>
          <span><strong>Focus Keyword:</strong> {item.focus_keyword || '—'}</span>
          <span><strong>Words:</strong> {item.word_count}</span>
        </div>
      </div>

      {item.meta_title && (
        <div style={{ background: 'var(--bg, #fff)', border: '1px solid var(--border-color, #dee2e6)', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', opacity: 0.6 }}>SEO Preview</div>
          <div style={{ color: '#1a0dab', fontSize: '1.1rem' }}>{item.meta_title}</div>
          <div style={{ color: '#006621', fontSize: '0.85rem' }}>/articles/{item.slug}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{item.meta_description}</div>
        </div>
      )}

      {item.excerpt && (
        <div style={{ fontStyle: 'italic', opacity: 0.7, marginBottom: '1rem', fontSize: '0.9rem' }}>
          {item.excerpt}
        </div>
      )}

      {articleContent ? (
        <div style={{ border: '1px solid var(--border-color, #dee2e6)', borderRadius: '6px', padding: '1rem', background: 'var(--bg, #fff)', maxHeight: '500px', overflow: 'auto' }}>
          <BlockEditor
            value={articleContent}
            onChange={() => {}}
            readOnly={true}
          />
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
          No content preview available
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------

function SettingsTab() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('auto-blog/config');
      setConfigs(data.configs || []);
    } catch (err) {
      console.error('Failed to fetch configs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSave = async (config) => {
    setSaving(config.id);
    try {
      const body = {
        enabled: config.enabled,
        posts_per_day: config.posts_per_day,
        tone: config.tone,
        style_notes: config.style_notes,
        target_word_count_min: config.target_word_count_min,
        target_word_count_max: config.target_word_count_max,
        topics: typeof config.topics === 'string' ? JSON.parse(config.topics) : config.topics,
        content_type_ratios: typeof config.content_type_ratios === 'string' ? JSON.parse(config.content_type_ratios) : config.content_type_ratios,
      };
      await apiFetch(`auto-blog/config/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleGenerate = async (configId) => {
    if (!confirm('Generate an article now? This will create a draft in the queue.')) return;
    setSaving(configId);
    try {
      const data = await apiFetch('auto-blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId }),
      });
      alert(`Generated: "${data.title}"`);
    } catch (err) {
      alert('Generation failed: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="loading-state"><div className="spinner"></div><p>Loading settings...</p></div>;
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {configs.map(config => (
        <MagazineConfigCard
          key={config.id}
          config={config}
          onSave={handleSave}
          onGenerate={() => handleGenerate(config.id)}
          saving={saving === config.id}
        />
      ))}
      {configs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
          No configs found. Run the migration to pre-seed magazine configurations.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Magazine Config Card
// ---------------------------------------------------------------------------

function MagazineConfigCard({ config: initialConfig, onSave, onGenerate, saving }) {
  const [config, setConfig] = useState(() => ({
    ...initialConfig,
    topics: typeof initialConfig.topics === 'string' ? JSON.parse(initialConfig.topics) : initialConfig.topics || [],
    content_type_ratios: typeof initialConfig.content_type_ratios === 'string' ? JSON.parse(initialConfig.content_type_ratios) : initialConfig.content_type_ratios || {},
  }));
  const [showTopics, setShowTopics] = useState(false);

  const update = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

  const updateTopic = (index, field, value) => {
    const newTopics = [...config.topics];
    newTopics[index] = { ...newTopics[index], [field]: value };
    update('topics', newTopics);
  };

  const addTopic = () => {
    update('topics', [...config.topics, { topic: '', content_type: 'how-to', weight: 1, search_intent: 'informational' }]);
  };

  const removeTopic = (index) => {
    update('topics', config.topics.filter((_, i) => i !== index));
  };

  return (
    <div style={{ border: '1px solid var(--border-color, #dee2e6)', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        background: config.enabled ? 'linear-gradient(135deg, #3e1c56 0%, #5a2d82 100%)' : 'var(--card-bg, #f8f9fa)',
        color: config.enabled ? '#fff' : 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{MAGAZINE_LABELS[config.magazine] || config.magazine}</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => update('enabled', e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Enabled
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onGenerate} disabled={saving} style={{ ...btnSmall, background: config.enabled ? 'rgba(255,255,255,0.2)' : 'var(--primary, #3e1c56)', color: '#fff' }}>
            {saving ? 'Working...' : 'Generate Now'}
          </button>
          <button onClick={() => onSave(config)} disabled={saving} style={{ ...btnSmall, background: '#198754', color: '#fff' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Posts per Day</label>
            <input
              type="range"
              min="1" max="5"
              value={config.posts_per_day}
              onChange={e => update('posts_per_day', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{config.posts_per_day}</div>
          </div>
          <div>
            <label style={labelStyle}>Tone</label>
            <input
              type="text"
              value={config.tone || ''}
              onChange={e => update('tone', e.target.value)}
              placeholder="e.g. practical and encouraging"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Word Count Range</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                value={config.target_word_count_min}
                onChange={e => update('target_word_count_min', parseInt(e.target.value) || 800)}
                style={{ ...inputStyle, width: '80px' }}
              />
              <span>—</span>
              <input
                type="number"
                value={config.target_word_count_max}
                onChange={e => update('target_word_count_max', parseInt(e.target.value) || 1500)}
                style={{ ...inputStyle, width: '80px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Style Notes</label>
          <textarea
            value={config.style_notes || ''}
            onChange={e => update('style_notes', e.target.value)}
            placeholder="Additional guardrails or instructions for the AI..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Topics section */}
        <div>
          <button
            onClick={() => setShowTopics(!showTopics)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <i className={`fas fa-chevron-${showTopics ? 'down' : 'right'}`} style={{ fontSize: '0.7rem' }}></i>
            Topics ({config.topics.length})
          </button>

          {showTopics && (
            <div style={{ marginTop: '0.5rem' }}>
              {config.topics.map((topic, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={topic.topic}
                    onChange={e => updateTopic(i, 'topic', e.target.value)}
                    placeholder="Topic name"
                    style={{ ...inputStyle, flex: '2', minWidth: '200px' }}
                  />
                  <select value={topic.content_type} onChange={e => updateTopic(i, 'content_type', e.target.value)} style={{ ...selectStyle, flex: '1', minWidth: '120px' }}>
                    {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                  <select value={topic.search_intent} onChange={e => updateTopic(i, 'search_intent', e.target.value)} style={{ ...selectStyle, flex: '1', minWidth: '120px' }}>
                    {SEARCH_INTENTS.map(si => <option key={si.value} value={si.value}>{si.label}</option>)}
                  </select>
                  <input
                    type="number"
                    value={topic.weight}
                    onChange={e => updateTopic(i, 'weight', parseInt(e.target.value) || 1)}
                    min="1" max="10"
                    style={{ ...inputStyle, width: '60px' }}
                    title="Weight (1-10)"
                  />
                  <button onClick={() => removeTopic(i)} style={{ ...btnSmall, background: '#dc3545', color: '#fff', padding: '0.3rem 0.5rem' }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button onClick={addTopic} style={{ ...btnSmall, background: 'var(--primary, #3e1c56)', color: '#fff', marginTop: '0.25rem' }}>
                <i className="fas fa-plus" style={{ marginRight: '0.4rem' }}></i>Add Topic
              </button>
            </div>
          )}
        </div>

        {/* Content type ratio visualization */}
        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Content Type Ratios (target %)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.entries(config.content_type_ratios).map(([type, pct]) => (
              <div key={type} style={{ background: 'var(--card-bg, #f0f0f0)', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                <strong>{type}:</strong> {pct}%
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const thStyle = { padding: '0.6rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 };
const tdStyle = { padding: '0.6rem 0.75rem', fontSize: '0.9rem', verticalAlign: 'middle' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', opacity: 0.7 };
const inputStyle = { padding: '0.4rem 0.6rem', border: '1px solid var(--border-color, #dee2e6)', borderRadius: '4px', fontSize: '0.9rem', width: '100%', background: 'var(--bg, #fff)' };
const selectStyle = { padding: '0.4rem 0.6rem', border: '1px solid var(--border-color, #dee2e6)', borderRadius: '4px', fontSize: '0.9rem', background: 'var(--bg, #fff)' };
const btnSmall = { padding: '0.35rem 0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };
