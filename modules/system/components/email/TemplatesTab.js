/**
 * Templates Tab Component
 * Manage email templates with editing and preview functionality
 */

import { useState, useEffect } from 'react';
import { getTemplates, getTemplate, updateTemplate, sendPreview } from '../../../../lib/email/api';

export default function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewEmail, setPreviewEmail] = useState('');
  const [sendingPreview, setSendingPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getTemplates();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (templateId) => {
    if (expandedId === templateId) {
      setExpandedId(null);
      setEditData({});
      return;
    }
    
    try {
      const result = await getTemplate(templateId);
      if (result.success) {
        setEditData(result.data);
        setExpandedId(templateId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess('');
      
      const result = await updateTemplate(editData.id, {
        name: editData.name,
        subject_template: editData.subject_template,
        body_template: editData.body_template,
        priority_level: editData.priority_level,
        is_transactional: editData.is_transactional
      });
      
      if (result.success) {
        setSuccess('Template saved successfully');
        // Update in list
        setTemplates(prev => prev.map(t => 
          t.id === editData.id ? { ...t, ...result.data } : t
        ));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendPreview = async () => {
    if (!previewEmail) {
      setError('Please enter an email address for preview');
      return;
    }
    
    try {
      setSendingPreview(true);
      setError(null);
      setSuccess('');
      
      const result = await sendPreview({
        email: previewEmail,
        template_id: editData.id,
        subject: editData.subject_template,
        body: editData.body_template
      });
      
      if (result.success) {
        setSuccess(`Preview sent to ${previewEmail}`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingPreview(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading templates...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h3>Email Templates</h3>
        <span className="text-muted">{templates.length} templates</span>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="template-list">
        {templates.map(template => (
          <div key={template.id} className="template-item">
            {/* Template Header */}
            <div 
              className="template-header"
              onClick={() => handleExpand(template.id)}
            >
              <div className="template-info">
                <strong>{template.name}</strong>
                <code className="template-key">{template.template_key}</code>
              </div>
              <div className="template-meta">
                <span className={`badge ${template.is_transactional ? 'badge-info' : 'badge-secondary'}`}>
                  {template.is_transactional ? 'Transactional' : 'Marketing'}
                </span>
                <span className="badge badge-light">P{template.priority_level}</span>
                <span className="expand-icon">
                  {expandedId === template.id ? '▼' : '▶'}
                </span>
              </div>
            </div>
            
            {/* Expanded Editor */}
            {expandedId === template.id && editData.id && (
              <div className="template-editor">
                {/* Template Stats */}
                {editData.stats && (
                  <div className="template-stats">
                    <span>Total: {editData.stats.total_sent || 0}</span>
                    <span className="text-success">Sent: {editData.stats.successful || 0}</span>
                    <span className="text-danger">Failed: {editData.stats.failed || 0}</span>
                    <span className="text-warning">Bounced: {editData.stats.bounced || 0}</span>
                  </div>
                )}
                
                {/* Name */}
                <div className="form-group">
                  <label>Template Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                
                {/* Subject */}
                <div className="form-group">
                  <label>Subject Template</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editData.subject_template || ''}
                    onChange={(e) => handleInputChange('subject_template', e.target.value)}
                    placeholder="Use {{variable}} for dynamic content"
                  />
                </div>
                
                {/* Body */}
                <div className="form-group">
                  <label>Body Template (HTML)</label>
                  <textarea
                    className="form-textarea code-editor"
                    rows={15}
                    value={editData.body_template || ''}
                    onChange={(e) => handleInputChange('body_template', e.target.value)}
                    placeholder="HTML content with {{variable}} placeholders"
                  />
                  <small className="help-text">
                    Use {'{{variable}}'} syntax for dynamic content. Available: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}, etc.
                  </small>
                </div>
                
                {/* Options */}
                <div className="form-row">
                  <div className="form-group half">
                    <label>Priority Level</label>
                    <select
                      className="form-select"
                      value={editData.priority_level || 3}
                      onChange={(e) => handleInputChange('priority_level', parseInt(e.target.value))}
                    >
                      <option value={1}>1 - Highest</option>
                      <option value={2}>2 - High</option>
                      <option value={3}>3 - Normal</option>
                      <option value={4}>4 - Low</option>
                      <option value={5}>5 - Lowest</option>
                    </select>
                  </div>
                  <div className="form-group half">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editData.is_transactional || false}
                        onChange={(e) => handleInputChange('is_transactional', e.target.checked)}
                      />
                      Transactional (bypasses preferences)
                    </label>
                  </div>
                </div>
                
                {/* Preview Section */}
                <div className="preview-section">
                  <label>Send Preview</label>
                  <div className="preview-row">
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Enter email for preview"
                      value={previewEmail}
                      onChange={(e) => setPreviewEmail(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={handleSendPreview}
                      disabled={sendingPreview || !previewEmail}
                    >
                      {sendingPreview ? 'Sending...' : 'Send Preview'}
                    </button>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="form-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setExpandedId(null);
                      setEditData({});
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .template-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .template-item {
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: hidden;
          background: #fff;
        }
        
        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .template-header:hover {
          background: #f8f9fa;
        }
        
        .template-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .template-key {
          font-size: 0.8rem;
          color: #666;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
        }
        
        .template-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .expand-icon {
          color: #666;
          margin-left: 0.5rem;
        }
        
        .template-editor {
          padding: 1.5rem;
          border-top: 1px solid #eee;
          background: #fafafa;
        }
        
        .template-stats {
          display: flex;
          gap: 1.5rem;
          padding: 0.75rem 1rem;
          background: #fff;
          border-radius: 4px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.95rem;
        }
        
        .code-editor {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.85rem;
          line-height: 1.5;
        }
        
        .help-text {
          display: block;
          margin-top: 0.25rem;
          color: #666;
          font-size: 0.85rem;
        }
        
        .form-row {
          display: flex;
          gap: 1rem;
        }
        
        .form-group.half {
          flex: 1;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          margin-top: 1.5rem;
        }
        
        .preview-section {
          padding: 1rem;
          background: #fff;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        
        .preview-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .preview-row .form-input {
          flex: 1;
        }
        
        .form-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .badge-info {
          background: #cce5ff;
          color: #004085;
        }
        
        .badge-secondary {
          background: #e9ecef;
          color: #495057;
        }
        
        .badge-light {
          background: #f8f9fa;
          color: #666;
        }
      `}</style>
    </div>
  );
}
