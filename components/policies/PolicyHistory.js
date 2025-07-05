import styles from '../../styles/Policies.module.css';

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
    <div className={styles.section}>
      <h2>{displayTitle}</h2>
      <div className={styles.historyContainer}>
        {history.map((policy) => (
          <div key={policy.id} className={styles.historyItem}>
            <div className={styles.historyHeader}>
              <span className={styles.historyStatus}>
                {policy.status === 'active' ? 'Active' : 'Archived'}
              </span>
              <span className={styles.historyDate}>
                {new Date(policy.created_at).toLocaleDateString()} 
                {policy.created_by_username && ` by ${policy.created_by_username}`}
              </span>
            </div>
            <div className={styles.historyText}>
              {policy.policy_text.substring(0, 200)}
              {policy.policy_text.length > 200 && '...'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 