import styles from '../../../SlideIn.module.css';

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
      <h3 style={{ marginBottom: '15px', color: '#495057' }}>{displayTitle}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {history.map((policy) => (
          <div key={policy.id} className="form-card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px' 
            }}>
              <span className={`${styles.statusBadge} ${
                policy.status === 'active' ? styles.statusCompleted : styles.statusDefault
              }`}>
                {policy.status === 'active' ? 'Active' : 'Archived'}
              </span>
              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                {new Date(policy.created_at).toLocaleDateString()} 
                {policy.created_by_username && ` by ${policy.created_by_username}`}
              </span>
            </div>
            <div style={{ 
              fontSize: '14px',
              color: '#495057',
              lineHeight: '1.5',
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px'
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