/**
 * Policies Tab Component
 * Manage site-wide policies (shipping, returns, privacy, etc.)
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getAllPolicies, updatePolicy } from '../../../../lib/system/api';

// Dynamic import for BlockEditor to avoid SSR issues
const BlockEditor = dynamic(() => import('../../../shared/block-editor'), { 
  ssr: false,
  loading: () => <div className="loading-state"><div className="spinner"></div><span>Loading editor...</span></div>
});

export default function PoliciesTab() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAllPolicies();
      if (result.success) {
        setPolicies(result.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = (policy) => {
    if (expandedPolicy?.type === policy.type) {
      setExpandedPolicy(null);
      setEditContent('');
    } else {
      setExpandedPolicy(policy);
      setEditContent(policy.policy_text || '');
    }
  };

  const handleContentChange = (content) => {
    const contentToStore = typeof content === 'object' ? JSON.stringify(content) : content;
    setEditContent(contentToStore);
  };

  const handleSave = async () => {
    if (!expandedPolicy) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await updatePolicy(expandedPolicy.type, editContent);
      setSuccess(`${expandedPolicy.label} updated successfully!`);
      
      // Update local state
      setPolicies(prev => prev.map(p => 
        p.type === expandedPolicy.type 
          ? { ...p, policy_text: editContent, status: 'active' }
          : p
      ));
      
      setExpandedPolicy(null);
      setEditContent('');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading policies...</span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        Manage site-wide policies displayed in the footer and on public policy pages. 
        Click a policy to edit its content.
      </p>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="policy-list">
        {policies.map(policy => (
          <div key={policy.type} className="policy-item">
            <div 
              className="policy-header"
              onClick={() => handleExpand(policy)}
            >
              <div className="policy-info">
                <strong>{policy.label}</strong>
                <span className="policy-meta">
                  {policy.status === 'active' ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-secondary">No content</span>
                  )}
                  <span className="text-muted">Last updated: {formatDate(policy.created_at)}</span>
                </span>
              </div>
              <span className="expand-icon">
                {expandedPolicy?.type === policy.type ? '▼' : '▶'}
              </span>
            </div>

            {expandedPolicy?.type === policy.type && (
              <div className="policy-editor">
                <BlockEditor
                  value={editContent}
                  onChange={handleContentChange}
                  minHeight={400}
                  placeholder={`Enter ${policy.label.toLowerCase()} content...`}
                />
                
                <div className="editor-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { setExpandedPolicy(null); setEditContent(''); }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Policy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .policy-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .policy-item {
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: hidden;
          background: #fff;
        }
        
        .policy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .policy-header:hover {
          background: #f8f9fa;
        }
        
        .policy-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .policy-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
        }
        
        .expand-icon {
          color: #666;
        }
        
        .policy-editor {
          padding: 1.5rem;
          border-top: 1px solid #eee;
          background: #fafafa;
        }
        
        .editor-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .badge-success {
          background: #d4edda;
          color: #155724;
        }
        
        .badge-secondary {
          background: #e9ecef;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
}
