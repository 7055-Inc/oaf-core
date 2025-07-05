import { useState } from 'react';
import styles from '../../styles/Policies.module.css';

export default function PolicyEditor({
  policy,
  policyType = 'shipping', // 'shipping' or 'return'
  isEditing = false,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onApplyDefault,
  saving = false,
  message = '',
  error = '',
  isAdmin = false,
  extraActions = null
}) {
  const [editText, setEditText] = useState('');
  const [localMessage, setLocalMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const handleEdit = () => {
    // Handle both string and object policy formats
    const policyText = typeof policy === 'string' ? policy : policy?.policy_text || '';
    setEditText(policyText);
    setLocalMessage('');
    setLocalError('');
    onEdit();
  };

  const handleSave = async () => {
    try {
      setLocalMessage('');
      setLocalError('');
      await onSave(editText.trim());
      setLocalMessage('Policy updated successfully!');
    } catch (err) {
      setLocalError(err.message || 'Failed to update policy');
    }
  };

  const handleCancel = () => {
    setEditText('');
    setLocalMessage('');
    setLocalError('');
    onCancel();
  };

  const handleApplyDefault = async () => {
    if (onApplyDefault) {
      try {
        setLocalMessage('');
        setLocalError('');
        await onApplyDefault();
        setLocalMessage('Default policy applied successfully!');
      } catch (err) {
        setLocalError(err.message || 'Failed to apply default policy');
      }
    }
  };

  const policyTypeLabel = policyType === 'return' ? 'Return' : 'Shipping';
  const policyTypeLower = policyType.toLowerCase();
  
  // Handle both string and object policy formats
  const policyText = typeof policy === 'string' ? policy : policy?.policy_text || '';
  const policySource = typeof policy === 'string' ? 'custom' : policy?.policy_source || 'default';

  return (
    <div className={styles.section}>
      {!isAdmin && (
        <div className={styles.sectionHeader}>
          <h2>Current {policyTypeLabel} Policy</h2>
          <div className={styles.policySource}>
            {policySource === 'custom' ? (
              <span className={styles.customBadge}>Custom Policy</span>
            ) : (
              <span className={styles.defaultBadge}>Default Policy</span>
            )}
          </div>
        </div>
      )}

      {(localMessage || message) && (
        <div className={styles.successMessage}>
          {localMessage || message}
        </div>
      )}

      {(localError || error) && (
        <div className={styles.errorMessage}>
          {localError || error}
        </div>
      )}

      <div className={styles.policyContent}>
        {isEditing ? (
          <div className={styles.editContainer}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={`Enter your ${policyTypeLower} policy...`}
              className={styles.policyTextarea}
              rows={8}
            />
            <div className={styles.editButtons}>
              <button 
                onClick={handleSave} 
                disabled={saving || !editText.trim()}
                className={styles.saveButton}
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
              <button 
                onClick={handleCancel}
                className={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.displayContainer}>
            <div className={styles.policyText}>
              {policyText || `No ${policyTypeLower} policy found`}
            </div>
            <div className={styles.actionButtons}>
              <button 
                onClick={handleEdit}
                className={styles.editButton}
              >
                {policySource === 'custom' ? 'Edit Policy' : `Create Custom ${policyTypeLabel} Policy`}
              </button>
              {policySource === 'custom' && onApplyDefault && (
                <button 
                  onClick={handleApplyDefault}
                  className={styles.secondaryButton}
                  disabled={saving}
                >
                  {saving ? 'Applying...' : 'Apply Recommended Default'}
                </button>
              )}
              {policySource === 'custom' && onDelete && (
                <button 
                  onClick={onDelete}
                  className={styles.deleteButton}
                  disabled={saving}
                >
                  {saving ? 'Deleting...' : `Delete Custom ${policyTypeLabel} Policy`}
                </button>
              )}
              {extraActions}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 