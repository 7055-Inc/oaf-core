import { useState } from 'react';

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
    <div className="section-box">
      {!isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Current {policyTypeLabel} Policy</h2>
          <div>
            {policySource === 'custom' ? (
              <span style={{ 
                background: '#059669', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '0.25rem', 
                fontSize: '0.75rem', 
                fontWeight: '500' 
              }}>
                Custom Policy
              </span>
            ) : (
              <span style={{ 
                background: '#6b7280', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '0.25rem', 
                fontSize: '0.75rem', 
                fontWeight: '500' 
              }}>
                Default Policy
              </span>
            )}
          </div>
        </div>
      )}

      {(localMessage || message) && (
        <div className="success-alert">
          {localMessage || message}
        </div>
      )}

      {(localError || error) && (
        <div className="error-alert">
          {localError || error}
        </div>
      )}

      <div style={{ 
        background: '#f9fafb', 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        padding: '1.5rem' 
      }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={`Enter your ${policyTypeLower} policy...`}
              rows={8}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleSave} 
                disabled={saving || !editText.trim()}
                style={{
                  opacity: (saving || !editText.trim()) ? '0.6' : '1',
                  cursor: (saving || !editText.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
              <button 
                onClick={handleCancel}
                className="secondary"
                disabled={saving}
                style={{
                  opacity: saving ? '0.6' : '1',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              color: '#374151',
              lineHeight: '1.6',
              fontSize: '0.95rem',
              whiteSpace: 'pre-wrap',
              marginBottom: '1rem'
            }}>
              {policyText || `No ${policyTypeLower} policy found`}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <button onClick={handleEdit}>
                {policySource === 'custom' ? 'Edit Policy' : `Create Custom ${policyTypeLabel} Policy`}
              </button>
              {policySource === 'custom' && onApplyDefault && (
                <button 
                  onClick={handleApplyDefault}
                  className="secondary"
                  disabled={saving}
                  style={{
                    opacity: saving ? '0.6' : '1',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Applying...' : 'Apply Recommended Default'}
                </button>
              )}
              {policySource === 'custom' && onDelete && (
                <button 
                  onClick={onDelete}
                  disabled={saving}
                  style={{
                    background: '#dc2626',
                    opacity: saving ? '0.6' : '1',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
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