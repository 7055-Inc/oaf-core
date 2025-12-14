import { useProductForm } from '../ProductFormContext';

export default function ProductTypeSection() {
  const { formData, updateField, mode } = useProductForm();

  const types = [
    {
      id: 'simple',
      title: 'Simple Product',
      description: 'A single product with one price and SKU',
      icon: '📦'
    },
    {
      id: 'variable',
      title: 'Variable Product',
      description: 'A product with variations (size, color, etc.)',
      icon: '🎨'
    }
  ];

  return (
    <div>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        What type of product are you adding?
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {types.map(type => (
          <div
            key={type.id}
            onClick={() => updateField('product_type', type.id)}
            style={{
              padding: '24px',
              border: formData.product_type === type.id 
                ? '2px solid var(--primary-color, #055474)' 
                : '2px solid #dee2e6',
              borderRadius: '12px',
              cursor: 'pointer',
              background: formData.product_type === type.id 
                ? 'rgba(5, 84, 116, 0.05)' 
                : 'white',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{type.icon}</div>
            <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '8px' }}>
              {type.title}
            </div>
            <div style={{ color: '#666', fontSize: '13px' }}>
              {type.description}
            </div>
            
            {formData.product_type === type.id && (
              <div style={{ 
                marginTop: '12px', 
                color: 'var(--primary-color, #055474)',
                fontWeight: '600',
                fontSize: '13px'
              }}>
                ✓ Selected
              </div>
            )}
          </div>
        ))}
      </div>

      {mode === 'edit' && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#fff3cd', 
          borderRadius: '6px',
          fontSize: '13px',
          color: '#856404'
        }}>
          ⚠️ Changing product type may affect existing variations and data.
        </div>
      )}
    </div>
  );
}

// Summary for collapsed state
export function getProductTypeSummary(formData) {
  return formData.product_type === 'variable' ? 'Variable Product' : 'Simple Product';
}

