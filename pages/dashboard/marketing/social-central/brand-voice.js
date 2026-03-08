/**
 * Brand Voice Settings
 * Dashboard > Marketing > Social Central > Brand Voice
 *
 * Configure how the AI generates content — tone, style, personality,
 * banned phrases, example posts, and target audience.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../lib/users/api';
import { fetchBrandVoice, saveBrandVoice } from '../../../../lib/social-central/api';

const TONE_OPTIONS = [
  { value: 'warm and personal', label: 'Warm & Personal', desc: 'Friendly, approachable, like talking to a friend' },
  { value: 'witty and irreverent', label: 'Witty & Irreverent', desc: 'Playful humor, clever wordplay, unexpected angles' },
  { value: 'bold and provocative', label: 'Bold & Provocative', desc: 'Direct, challenging, attention-grabbing' },
  { value: 'calm and thoughtful', label: 'Calm & Thoughtful', desc: 'Reflective, measured, artistically-minded' },
  { value: 'energetic and enthusiastic', label: 'Energetic & Enthusiastic', desc: 'Upbeat, exciting, high-energy' },
  { value: 'professional and polished', label: 'Professional & Polished', desc: 'Refined, sophisticated, industry-facing' },
];

const STYLE_OPTIONS = [
  { value: 'short punchy sentences', label: 'Short & Punchy', desc: 'Quick hits. Direct. No fluff.' },
  { value: 'storytelling narrative', label: 'Storytelling', desc: 'Longer, narrative-driven captions that draw readers in' },
  { value: 'conversational', label: 'Conversational', desc: 'Like texting a friend — casual, relatable' },
  { value: 'poetic and lyrical', label: 'Poetic & Lyrical', desc: 'Flowing, evocative, artistically expressive' },
  { value: 'educational and informative', label: 'Educational', desc: 'Share knowledge, explain process, teach the audience' },
];

const EMOJI_OPTIONS = [
  { value: 'heavy', label: 'Heavy', desc: 'Lots of emojis throughout' },
  { value: 'moderate', label: 'Moderate', desc: 'A few per post — accents only' },
  { value: 'minimal', label: 'Minimal', desc: 'Occasional, just to punctuate' },
  { value: 'none', label: 'None', desc: 'No emojis ever' },
];

export default function BrandVoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    voice_tone: '',
    writing_style: '',
    brand_personality: '',
    emoji_usage: 'moderate',
    banned_phrases: [],
    example_posts: [],
    target_audience: '',
  });
  const [newBannedPhrase, setNewBannedPhrase] = useState('');
  const [newExamplePost, setNewExamplePost] = useState('');

  useEffect(() => {
    loadBrandVoice();
  }, []);

  const loadBrandVoice = async () => {
    try {
      await getCurrentUser();

      const result = await fetchBrandVoice();
      if (result.success && result.brandVoice) {
        setConfig(prev => ({ ...prev, ...result.brandVoice }));
      }
    } catch (err) {
      console.error('Error loading brand voice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const result = await saveBrandVoice(config);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving brand voice:', err);
    } finally {
      setSaving(false);
    }
  };

  const addBannedPhrase = () => {
    const phrase = newBannedPhrase.trim().toLowerCase();
    if (phrase && !config.banned_phrases.includes(phrase)) {
      setConfig(prev => ({ ...prev, banned_phrases: [...prev.banned_phrases, phrase] }));
      setNewBannedPhrase('');
    }
  };

  const removeBannedPhrase = (phrase) => {
    setConfig(prev => ({ ...prev, banned_phrases: prev.banned_phrases.filter(p => p !== phrase) }));
  };

  const addExamplePost = () => {
    const post = newExamplePost.trim();
    if (post && config.example_posts.length < 5) {
      setConfig(prev => ({ ...prev, example_posts: [...prev.example_posts, post] }));
      setNewExamplePost('');
    }
  };

  const removeExamplePost = (idx) => {
    setConfig(prev => ({ ...prev, example_posts: prev.example_posts.filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <DashboardShell>
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading brand voice settings...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <Head><title>Brand Voice Settings - Social Central</title></Head>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.push('/dashboard/marketing/social-central')}
            style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, padding: 0 }}
          >
            &larr; Back to Social Central
          </button>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Brand Voice</h1>
        <p style={{ color: '#666', marginBottom: 32, fontSize: 14 }}>
          Configure how AI generates your marketing content. These settings shape the tone, style, and personality of every AI-written post.
        </p>

        {/* Voice Tone */}
        <Section title="Voice Tone" subtitle="How should your brand sound?">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {TONE_OPTIONS.map(opt => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                desc={opt.desc}
                selected={config.voice_tone === opt.value}
                onClick={() => setConfig(prev => ({ ...prev, voice_tone: opt.value }))}
              />
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type your own tone..."
            value={TONE_OPTIONS.some(o => o.value === config.voice_tone) ? '' : config.voice_tone}
            onChange={e => setConfig(prev => ({ ...prev, voice_tone: e.target.value }))}
            style={inputStyle}
          />
        </Section>

        {/* Writing Style */}
        <Section title="Writing Style" subtitle="How should captions be structured?">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {STYLE_OPTIONS.map(opt => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                desc={opt.desc}
                selected={config.writing_style === opt.value}
                onClick={() => setConfig(prev => ({ ...prev, writing_style: opt.value }))}
              />
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type your own style..."
            value={STYLE_OPTIONS.some(o => o.value === config.writing_style) ? '' : config.writing_style}
            onChange={e => setConfig(prev => ({ ...prev, writing_style: e.target.value }))}
            style={inputStyle}
          />
        </Section>

        {/* Brand Personality */}
        <Section title="Brand Personality" subtitle="Describe your brand's character in your own words">
          <textarea
            value={config.brand_personality}
            onChange={e => setConfig(prev => ({ ...prev, brand_personality: e.target.value }))}
            placeholder="e.g. We're a small studio that takes our craft seriously but doesn't take ourselves too seriously. We love sharing the messy process behind the finished piece..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
          />
        </Section>

        {/* Target Audience */}
        <Section title="Target Audience" subtitle="Who are you trying to reach?">
          <input
            type="text"
            value={config.target_audience}
            onChange={e => setConfig(prev => ({ ...prev, target_audience: e.target.value }))}
            placeholder="e.g. Interior designers, art collectors, and people who appreciate handmade ceramics"
            style={inputStyle}
          />
        </Section>

        {/* Emoji Usage */}
        <Section title="Emoji Usage" subtitle="How much emoji should appear in posts?">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {EMOJI_OPTIONS.map(opt => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                desc={opt.desc}
                selected={config.emoji_usage === opt.value}
                onClick={() => setConfig(prev => ({ ...prev, emoji_usage: opt.value }))}
                compact
              />
            ))}
          </div>
        </Section>

        {/* Banned Phrases */}
        <Section title="Banned Phrases" subtitle="Phrases the AI should never use">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {(config.banned_phrases || []).map(phrase => (
              <span key={phrase} style={tagStyle}>
                {phrase}
                <button onClick={() => removeBannedPhrase(phrase)} style={tagRemoveStyle}>&times;</button>
              </span>
            ))}
            {config.banned_phrases?.length === 0 && <span style={{ color: '#999', fontSize: 13 }}>No banned phrases yet</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newBannedPhrase}
              onChange={e => setNewBannedPhrase(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBannedPhrase()}
              placeholder="Type a phrase and press Enter..."
              style={{ ...inputStyle, flex: 1, marginTop: 0 }}
            />
            <button onClick={addBannedPhrase} style={addBtnStyle}>Add</button>
          </div>
        </Section>

        {/* Example Posts */}
        <Section title="Example Posts" subtitle="Paste 1-5 posts you love — the AI will match this voice (optional)">
          {(config.example_posts || []).map((post, idx) => (
            <div key={idx} style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8, position: 'relative' }}>
              <button onClick={() => removeExamplePost(idx)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16 }}>&times;</button>
              <p style={{ fontSize: 13, color: '#333', margin: 0, paddingRight: 20, whiteSpace: 'pre-wrap' }}>{post}</p>
            </div>
          ))}
          {config.example_posts?.length < 5 && (
            <div>
              <textarea
                value={newExamplePost}
                onChange={e => setNewExamplePost(e.target.value)}
                placeholder="Paste a real caption or post you've written that captures your voice..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', marginTop: 0 }}
              />
              <button onClick={addExamplePost} style={{ ...addBtnStyle, marginTop: 8 }}>Add Example</button>
            </div>
          )}
        </Section>

        {/* Save Button */}
        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px 32px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Brand Voice'}
          </button>
          {saved && <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 500 }}>Saved successfully</span>}
        </div>
      </div>
    </DashboardShell>
  );
}

// -- Subcomponents --

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function OptionCard({ label, desc, selected, onClick, compact }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: compact ? '10px 14px' : '12px 16px',
        border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
        borderRadius: 8,
        background: selected ? '#f0f0ff' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s',
        minWidth: compact ? 120 : undefined,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: selected ? '#6366f1' : '#333' }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>}
    </button>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, marginTop: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const tagStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
  background: '#fef2f2', color: '#dc2626', borderRadius: 20, fontSize: 13,
};

const tagRemoveStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, padding: 0, lineHeight: 1,
};

const addBtnStyle = {
  background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8,
  padding: '8px 16px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
};
