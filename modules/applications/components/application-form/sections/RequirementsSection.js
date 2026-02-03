import { useApplicationForm } from '../ApplicationFormContext';

export default function RequirementsSection() {
  const {
    applicationFields,
    fieldResponses,
    handleFieldResponse,
    isVerified
  } = useApplicationForm();

  if (!applicationFields.length) return null;

  return (
    <div className="form-panel">
      <h3 style={{ marginTop: 0 }}>Application requirements</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Complete the following as required by the organizer.
        {isVerified && (
          <span style={{ display: 'block', marginTop: '0.5rem' }}>
            <i className="fas fa-certificate" style={{ marginRight: '0.35rem' }} /> Verified artists may skip optional fields marked with a star.
          </span>
        )}
      </p>
      {applicationFields.map(field => {
        const response = fieldResponses[field.id] || {};
        const canSkip = isVerified && field.verified_can_skip;
        const isRequired = field.is_required && !canSkip;
        const isPortfolioUrl = (field.field_name || '').toLowerCase().includes('portfolio url');
        const portfolioUrl = isPortfolioUrl ? formData.portfolio_url : (response.response_value || '');

        return (
          <div key={field.id} className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor={`field_${field.id}`}>
              {field.field_name}
              {isRequired && <span className="text-danger"> *</span>}
              {canSkip && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#666' }}><i className="fas fa-star" /> Optional for verified</span>}
            </label>
            {field.field_description && (
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.35rem' }}>{field.field_description}</div>
            )}

            {field.field_type === 'textarea' && (
              <textarea
                id={`field_${field.id}`}
                className="form-control"
                rows={(field.field_name || '').toLowerCase().includes('artist statement') ? 6 : 3}
                value={response.response_value || ''}
                onChange={e => handleFieldResponse(field.id, e.target.value)}
                required={isRequired}
              />
            )}

            {field.field_type === 'url' && (
              <input
                id={`field_${field.id}`}
                type="url"
                className="form-control"
                value={portfolioUrl}
                onChange={isPortfolioUrl ? () => {} : e => handleFieldResponse(field.id, e.target.value)}
                disabled={isPortfolioUrl}
                required={isRequired}
              />
            )}

            {field.field_type === 'text' && (
              <input
                id={`field_${field.id}`}
                type="text"
                className="form-control"
                value={response.response_value || ''}
                onChange={e => handleFieldResponse(field.id, e.target.value)}
                required={isRequired}
              />
            )}

            {(field.field_type === 'image' || field.field_type === 'video') && (
              <div>
                {response.file_url && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--success-color)' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '0.35rem' }} />
                    {response.response_value || 'File uploaded'}
                  </div>
                )}
                <input
                  type="file"
                  id={`field_${field.id}`}
                  accept={field.field_type === 'image' ? 'image/*' : 'video/*'}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFieldResponse(field.id, null, file);
                  }}
                  required={isRequired && !response.file_url}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
