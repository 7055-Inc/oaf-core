import { useEventForm } from '../EventFormContext';

export function getSEOSummary(formData) {
  const parts = [];
  if (formData.seo_title) parts.push('Custom title');
  if (formData.meta_description) parts.push('Meta description');
  if (formData.event_keywords) parts.push('Keywords');
  return parts.length > 0 ? parts.join(', ') : 'Using defaults';
}

export default function SEOSection() {
  const { formData, updateField } = useEventForm();

  return (
    <div>
      <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px 0' }}>
        Optimize how your event appears in search engines and help people find your event online.
      </p>

      {/* SEO Title */}
      <div style={{ marginBottom: '16px' }}>
        <label>Title for Search Engines</label>
        <input
          type="text"
          value={formData.seo_title}
          onChange={(e) => updateField('seo_title', e.target.value)}
          placeholder="Leave blank to use event title"
          maxLength={60}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '4px' }}>
          <span>Custom title shown in Google search results (60 chars max)</span>
          <span>{formData.seo_title?.length || 0}/60</span>
        </div>
      </div>

      {/* Meta Description */}
      <div style={{ marginBottom: '16px' }}>
        <label>Search Results Snippet</label>
        <textarea
          value={formData.meta_description}
          onChange={(e) => updateField('meta_description', e.target.value)}
          placeholder="Brief description shown in search results"
          maxLength={160}
          rows={3}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '4px' }}>
          <span>Description that appears under your title in search results</span>
          <span>{formData.meta_description?.length || 0}/160</span>
        </div>
      </div>

      {/* Keywords */}
      <div style={{ marginBottom: '16px' }}>
        <label>Event Keywords</label>
        <textarea
          value={formData.event_keywords}
          onChange={(e) => updateField('event_keywords', e.target.value)}
          placeholder="art festival, outdoor market, local artists, craft fair, family friendly"
          rows={2}
        />
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
          Keywords that describe your event, separated by commas
        </div>
      </div>

      {/* SEO Preview */}
      <div className="form-card">
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>Search Engine Preview</h4>
        <div style={{ 
          color: '#1a0dab', 
          fontSize: '18px', 
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {formData.seo_title || formData.title || 'Your Event Title'}
        </div>
        <div style={{ color: '#006621', fontSize: '13px', marginBottom: '4px' }}>
          brakebee.com/events/your-event
        </div>
        <div style={{ 
          color: '#545454', 
          fontSize: '13px', 
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {formData.meta_description || formData.short_description || formData.description?.substring(0, 160) || 'Your event description will appear here...'}
        </div>
      </div>
    </div>
  );
}
