import { useState } from 'react';
import styles from '../../../SlideIn.module.css';

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
    <div>
      {!isAdmin && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px' 
        }}>
          <h3 style={{ margin: 0, color: '#495057' }}>Current {policyTypeLabel} Policy</h3>
          <div>
            {policySource === 'custom' ? (
              <span className={`${styles.statusBadge} ${styles.statusProcessing}`}>Custom Policy</span>
            ) : (
              <span className={`${styles.statusBadge} ${styles.statusDefault}`}>Default Policy</span>
            )}
          </div>
        </div>
      )}

      {(localMessage || message) && (
        <div className="success-alert" style={{ marginBottom: '15px' }}>
          {localMessage || message}
        </div>
      )}

      {(localError || error) && (
        <div className="error-alert" style={{ marginBottom: '15px' }}>
          {localError || error}
        </div>
      )}

      <div>
        {isEditing ? (
          <div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={`Enter your ${policyTypeLower} policy...`}
              className="form-input"
              rows={8}
              style={{ 
                width: '100%', 
                resize: 'vertical',
                marginBottom: '15px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleSave} 
                disabled={saving || !editText.trim()}
                className="primary"
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
              <button 
                onClick={handleCancel}
                className="secondary"
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ 
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #e9ecef',
              marginBottom: '15px',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {policyText || `No ${policyTypeLower} policy found`}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleEdit}
                className="primary"
              >
                {policySource === 'custom' ? 'Edit Policy' : `Create Custom ${policyTypeLabel} Policy`}
              </button>
              {policySource === 'custom' && onApplyDefault && (
                <button 
                  onClick={handleApplyDefault}
                  className="secondary"
                  disabled={saving}
                >
                  {saving ? 'Applying...' : 'Apply Recommended Default'}
                </button>
              )}
              {policySource === 'custom' && onDelete && (
                <button 
                  onClick={onDelete}
                  className="danger"
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