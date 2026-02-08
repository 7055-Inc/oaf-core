/**
 * Templates Tab Component
 * Manage email templates with WYSIWYG block editing and preview functionality
 */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getTemplates, getTemplate, updateTemplate, sendPreview, getTemplateDefault, resetTemplateToDefault } from '../../../../lib/email/api';

// Dynamically import BlockEditor to avoid SSR issues
const BlockEditor = dynamic(
  () => import('../../../shared/block-editor/BlockEditor'),
  { ssr: false, loading: () => <div className="loading-state"><span>Loading editor...</span></div> }
);

// Convert Editor.js blocks to email-safe HTML
const blocksToEmailHtml = (blocksData) => {
  if (!blocksData) return '';
  
  // If it's already HTML string (legacy), return as-is
  if (typeof blocksData === 'string' && !blocksData.startsWith('{')) {
    return blocksData;
  }
  
  // Parse if JSON string
  let data = blocksData;
  if (typeof blocksData === 'string') {
    try {
      data = JSON.parse(blocksData);
    } catch (e) {
      return blocksData;
    }
  }
  
  if (!data.blocks || !Array.isArray(data.blocks)) {
    return '';
  }
  
  return data.blocks.map(block => {
    const { type, data: blockData } = block;
    
    switch (type) {
      case 'paragraph':
        return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">${blockData.text || ''}</p>`;
      
      case 'header':
        const level = blockData.level || 2;
        const sizes = { 2: '24px', 3: '20px', 4: '18px' };
        return `<h${level} style="margin: 24px 0 12px 0; font-size: ${sizes[level]}; color: #1a1a1a;">${blockData.text || ''}</h${level}>`;
      
      case 'list':
        const tag = blockData.style === 'ordered' ? 'ol' : 'ul';
        const items = (blockData.items || []).map(item => {
          const text = typeof item === 'string' ? item : item.content || '';
          return `<li style="margin: 8px 0;">${text}</li>`;
        }).join('');
        return `<${tag} style="margin: 16px 0; padding-left: 24px;">${items}</${tag}>`;
      
      case 'image':
        const imgUrl = blockData.file?.url || blockData.url || '';
        const caption = blockData.caption || '';
        return `<div style="margin: 24px 0; text-align: center;">
          <img src="${imgUrl}" alt="${caption}" style="max-width: 100%; height: auto; border-radius: 8px;" />
          ${caption ? `<p style="font-size: 14px; color: #666; margin-top: 8px;">${caption}</p>` : ''}
        </div>`;
      
      case 'quote':
        return `<blockquote style="margin: 24px 0; padding: 16px 24px; border-left: 4px solid #055474; background: #f8f9fa;">
          <p style="font-style: italic; color: #444; margin: 0;">${blockData.text || ''}</p>
          ${blockData.caption ? `<cite style="display: block; margin-top: 8px; font-size: 14px; color: #666;">— ${blockData.caption}</cite>` : ''}
        </blockquote>`;
      
      case 'delimiter':
        return `<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />`;
      
      case 'warning':
        return `<div style="margin: 24px 0; padding: 16px; background: #fff8e1; border-left: 4px solid #ff9800;">
          ${blockData.title ? `<strong style="color: #e65100;">${blockData.title}</strong><br />` : ''}
          <span style="color: #333;">${blockData.message || ''}</span>
        </div>`;
      
      case 'table':
        if (!blockData.content) return '';
        const rows = blockData.content.map((row, idx) => {
          const cells = row.map((cell, cidx) => {
            const cellTag = idx === 0 && blockData.withHeadings ? 'th' : 'td';
            const style = idx === 0 && blockData.withHeadings 
              ? 'padding: 12px; border: 1px solid #e0e0e0; background: #f5f5f5; font-weight: 600;'
              : 'padding: 12px; border: 1px solid #e0e0e0;';
            return `<${cellTag} style="${style}">${cell}</${cellTag}>`;
          }).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        return `<table style="width: 100%; border-collapse: collapse; margin: 24px 0;"><tbody>${rows}</tbody></table>`;
      
      default:
        if (blockData?.text) {
          return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${blockData.text}</p>`;
        }
        return '';
    }
  }).join('\n');
};

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
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'html'
  const [bodyBlocks, setBodyBlocks] = useState(null);
  const [usingDefault, setUsingDefault] = useState(false);
  const [hasDefaultConfig, setHasDefaultConfig] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      setBodyBlocks(null);
      setEditorMode('visual');
      setUsingDefault(false);
      setHasDefaultConfig(false);
      return;
    }
    
    try {
      const result = await getTemplate(templateId);
      if (result.success) {
        const templateData = result.data;
        
        // Check if config default exists
        let defaultConfig = null;
        try {
          const defaultResult = await getTemplateDefault(templateId);
          if (defaultResult.success) {
            defaultConfig = defaultResult.data;
            setHasDefaultConfig(true);
          }
        } catch (err) {
          // No default config available
          setHasDefaultConfig(false);
        }
        
        // If body_template is null and we have a default, load the default
        const isUsingDefault = !templateData.body_template && defaultConfig;
        setUsingDefault(isUsingDefault);
        
        const bodyToUse = templateData.body_template || 
                         (defaultConfig ? JSON.stringify(defaultConfig.body_template) : null);
        
        setEditData({
          ...templateData,
          body_template: bodyToUse
        });
        setExpandedId(templateId);
        
        // Try to parse body as blocks, otherwise treat as legacy HTML
        if (bodyToUse) {
          try {
            const parsed = JSON.parse(bodyToUse);
            if (parsed.blocks) {
              setBodyBlocks(parsed);
            } else {
              setBodyBlocks(null);
            }
          } catch (e) {
            // Legacy HTML content - convert to single paragraph block
            setBodyBlocks({
              blocks: [{
                type: 'paragraph',
                data: { text: bodyToUse }
              }]
            });
          }
        } else {
          setBodyBlocks({ blocks: [] });
        }
        setEditorMode('visual');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Handle block editor content change
  const handleBlockEditorChange = useCallback((outputData) => {
    setBodyBlocks(outputData);
    // Store both JSON (for editing) and HTML (for sending)
    const htmlContent = blocksToEmailHtml(outputData);
    setEditData(prev => ({
      ...prev,
      body_template: JSON.stringify(outputData), // Store JSON for re-editing
      body_html: htmlContent // HTML version for actual emails
    }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess('');
      
      // Generate HTML from blocks for email sending
      const bodyHtml = bodyBlocks ? blocksToEmailHtml(bodyBlocks) : editData.body_template;
      const bodyJson = bodyBlocks ? JSON.stringify(bodyBlocks) : editData.body_template;
      
      const result = await updateTemplate(editData.id, {
        name: editData.name,
        subject_template: editData.subject_template,
        body_template: bodyJson, // Store JSON blocks for editing
        body_html: bodyHtml, // Store HTML for actual email sending
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

  const handleResetToDefault = async () => {
    if (!confirm('Are you sure you want to reset this template to the system default? Any customizations will be lost.')) {
      return;
    }
    
    try {
      setResetting(true);
      setError(null);
      setSuccess('');
      
      const result = await resetTemplateToDefault(editData.id);
      
      if (result.success) {
        setSuccess('Template reset to default successfully');
        // Reload the template to show default content
        await handleExpand(editData.id);
        await loadTemplates();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
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
      
      // Use HTML version for preview
      const bodyHtml = bodyBlocks ? blocksToEmailHtml(bodyBlocks) : editData.body_template;
      
      const result = await sendPreview({
        email: previewEmail,
        template_id: editData.id,
        subject: editData.subject_template,
        body: bodyHtml
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
                
                {/* Default Indicator */}
                {usingDefault && (
                  <div className="default-indicator">
                    <span className="badge badge-info">
                      📄 Using System Default
                    </span>
                    <small>This template is using the default configuration. Any changes you make will create a customized version.</small>
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
                  <div className="body-editor-header">
                    <label>Body Template</label>
                    <div className="editor-mode-toggle">
                      <button
                        type="button"
                        className={`mode-btn ${editorMode === 'visual' ? 'active' : ''}`}
                        onClick={() => setEditorMode('visual')}
                      >
                        Visual Editor
                      </button>
                      <button
                        type="button"
                        className={`mode-btn ${editorMode === 'html' ? 'active' : ''}`}
                        onClick={() => setEditorMode('html')}
                      >
                        HTML Preview
                      </button>
                    </div>
                  </div>
                  
                  {editorMode === 'visual' ? (
                    <div className="block-editor-container">
                      <BlockEditor
                        value={bodyBlocks}
                        onChange={handleBlockEditorChange}
                        placeholder="Start writing your email content..."
                        minHeight={300}
                        imageUploadEndpoint="/api/v2/upload/image"
                      />
                    </div>
                  ) : (
                    <div className="html-preview-container">
                      <div className="html-preview-label">Generated HTML (read-only):</div>
                      <pre className="html-preview-code">
                        {bodyBlocks ? blocksToEmailHtml(bodyBlocks) : editData.body_template || ''}
                      </pre>
                    </div>
                  )}
                  
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
                  <div>
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
                  {hasDefaultConfig && !usingDefault && (
                    <button
                      className="btn btn-warning"
                      onClick={handleResetToDefault}
                      disabled={resetting}
                      title="Reset to system default template"
                    >
                      {resetting ? 'Resetting...' : 'Reset to Default'}
                    </button>
                  )}
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
        
        .body-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .body-editor-header label {
          margin: 0;
        }
        
        .editor-mode-toggle {
          display: flex;
          gap: 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .mode-btn {
          padding: 0.4rem 0.75rem;
          border: none;
          background: #fff;
          color: #666;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mode-btn:not(:last-child) {
          border-right: 1px solid #ddd;
        }
        
        .mode-btn:hover {
          background: #f5f5f5;
        }
        
        .mode-btn.active {
          background: #055474;
          color: #fff;
        }
        
        .block-editor-container {
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: hidden;
          background: #fff;
        }
        
        .html-preview-container {
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #1e1e1e;
          overflow: hidden;
        }
        
        .html-preview-label {
          padding: 0.5rem 1rem;
          background: #2d2d2d;
          color: #888;
          font-size: 0.8rem;
          border-bottom: 1px solid #3d3d3d;
        }
        
        .html-preview-code {
          margin: 0;
          padding: 1rem;
          color: #d4d4d4;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .default-indicator {
          padding: 1rem;
          background: #e7f5ff;
          border: 1px solid #74c0fc;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }
        
        .default-indicator .badge {
          margin-bottom: 0.5rem;
        }
        
        .default-indicator small {
          display: block;
          color: #495057;
          line-height: 1.5;
        }
        
        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .form-actions > div {
          display: flex;
          gap: 0.75rem;
        }
        
        .btn-warning {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffc107;
        }
        
        .btn-warning:hover:not(:disabled) {
          background-color: #ffc107;
          color: #000;
        }
        
        .btn-warning:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
