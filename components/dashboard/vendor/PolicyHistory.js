export default function PolicyHistory({ 
  history = [], 
  policyType = 'shipping',
  title
}) {
  if (!history || history.length === 0) {
    return null;
  }

  const policyTypeLabel = policyType === 'return' ? 'Return' : 'Shipping';
  const displayTitle = title || `${policyTypeLabel} Policy Update History`;

  return (
    <div className="section-box">
      <h2>{displayTitle}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {history.map((policy) => (
          <div 
            key={policy.id} 
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              padding: '1rem'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '0.5rem' 
            }}>
              <span style={{
                background: '#6b7280',
                color: 'white',
                padding: '0.125rem 0.375rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}>
                {policy.status === 'active' ? 'Active' : 'Archived'}
              </span>
              <span style={{
                color: '#6b7280',
                fontSize: '0.75rem'
              }}>
                {new Date(policy.created_at).toLocaleDateString()} 
                {policy.created_by_username && ` by ${policy.created_by_username}`}
              </span>
            </div>
            <div style={{
              color: '#374151',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}>
              {policy.policy_text.substring(0, 200)}
              {policy.policy_text.length > 200 && '...'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 