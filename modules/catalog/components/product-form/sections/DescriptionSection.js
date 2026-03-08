import { useProductForm } from '../ProductFormContext';

export default function DescriptionSection() {
  const { formData, updateField } = useProductForm();

  const textareaStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '13px',
    color: '#333'
  };

  return (
    <div>
      {/* Short Description */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Short Description</label>
        <textarea
          value={formData.short_description}
          onChange={e => updateField('short_description', e.target.value)}
          style={{ ...textareaStyle, minHeight: '80px' }}
          placeholder="Brief summary shown in product listings and search results..."
          maxLength={500}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '11px', 
          color: '#666', 
          marginTop: '4px' 
        }}>
          <span>Appears in product cards and search results</span>
          <span>{formData.short_description?.length || 0}/500</span>
        </div>
      </div>

      {/* Full Description */}
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Full Description</label>
        <textarea
          value={formData.description}
          onChange={e => updateField('description', e.target.value)}
          style={{ ...textareaStyle, minHeight: '200px' }}
          placeholder="Detailed product description. Include materials, dimensions, care instructions, and anything else customers should know..."
        />
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Full description shown on the product detail page
        </div>
      </div>

      {/* Tips */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#e8f4fd',
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        <strong>💡 Writing Tips:</strong>
        <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Start with the most important features</li>
          <li>Include materials, dimensions, and care instructions</li>
          <li>Tell the story behind your product</li>
          <li>Use bullet points for easy scanning</li>
        </ul>
      </div>
    </div>
  );
}

// Summary for collapsed state
export function getDescriptionSummary(formData) {
  if (!formData.description && !formData.short_description) return null;
  const text = formData.short_description || formData.description;
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
}

