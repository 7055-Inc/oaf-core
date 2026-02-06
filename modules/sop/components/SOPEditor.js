/**
 * SOP Editor Component
 * Form for creating and editing SOPs with block editor fields
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useSOP } from './SOPContext';
import { createSop, updateSop, fetchSop } from '../../../lib/sop';

// Dynamic import for block editor to avoid SSR issues
const BlockEditor = dynamic(
  () => import('../../shared/block-editor/BlockEditor'),
  { ssr: false, loading: () => <div className="editor-loading">Loading editor...</div> }
);

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default function SOPEditor({ sopId = null, initialFolderId = null }) {
  const router = useRouter();
  const { foldersFlat, loadFolders, isTop } = useSOP();
  
  const [loading, setLoading] = useState(!!sopId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    folder_id: initialFolderId || null,
    status: 'draft',
    owner_role: '',
    change_notes: '',
    purpose_expected_outcome: '',
    when_to_use: '',
    when_not_to_use: '',
    standard_workflow: null,
    exit_points: null,
    escalation: null,
    transfer: null,
    additional_information: null,
  });

  // Load existing SOP data
  useEffect(() => {
    if (sopId) {
      loadSopData();
    }
    loadFolders();
  }, [sopId]);

  const loadSopData = async () => {
    setLoading(true);
    try {
      const { sop } = await fetchSop(sopId);
      setFormData({
        title: sop.title || '',
        folder_id: sop.folder_id || null,
        status: sop.status || 'draft',
        owner_role: sop.owner_role || '',
        change_notes: sop.change_notes || '',
        purpose_expected_outcome: sop.purpose_expected_outcome || '',
        when_to_use: sop.when_to_use || '',
        when_not_to_use: sop.when_not_to_use || '',
        standard_workflow: sop.standard_workflow || null,
        exit_points: sop.exit_points || null,
        escalation: sop.escalation || null,
        transfer: sop.transfer || null,
        additional_information: sop.additional_information || null,
      });
    } catch (err) {
      setError('Failed to load SOP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (sopId) {
        await updateSop(sopId, formData);
      } else {
        const newSop = await createSop(formData);
        router.push(`/sop/${newSop.id}`);
        return;
      }
      // Show success message or redirect
      router.push(`/sop/${sopId}`);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="sop-editor-loading">
        <i className="fas fa-spinner fa-spin"></i>
        Loading SOP...
      </div>
    );
  }

  return (
    <div className="sop-editor">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {/* Basic Info Section */}
        <div className="sop-editor-section">
          <h3>Basic Information</h3>
          
          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="sop-title">Title *</label>
              <input
                id="sop-title"
                type="text"
                className="form-control"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Enter SOP title"
                required
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="sop-status">Status</label>
              <select
                id="sop-status"
                className="form-control"
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                disabled={!isTop}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="sop-folder">Folder</label>
              <select
                id="sop-folder"
                className="form-control"
                value={formData.folder_id || ''}
                onChange={(e) => handleFieldChange('folder_id', e.target.value || null)}
              >
                <option value="">No folder</option>
                {foldersFlat.map(f => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label htmlFor="sop-owner">Owner Role</label>
              <input
                id="sop-owner"
                type="text"
                className="form-control"
                value={formData.owner_role}
                onChange={(e) => handleFieldChange('owner_role', e.target.value)}
                placeholder="e.g., Customer Support"
              />
            </div>
          </div>
        </div>

        {/* Context Section */}
        <div className="sop-editor-section">
          <h3>Context</h3>

          <div className="form-group">
            <label htmlFor="sop-purpose">Purpose & Expected Outcome</label>
            <textarea
              id="sop-purpose"
              className="form-control"
              value={formData.purpose_expected_outcome}
              onChange={(e) => handleFieldChange('purpose_expected_outcome', e.target.value)}
              placeholder="What is the purpose of this SOP and what outcome should be achieved?"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="sop-when-use">When to Use</label>
              <textarea
                id="sop-when-use"
                className="form-control"
                value={formData.when_to_use}
                onChange={(e) => handleFieldChange('when_to_use', e.target.value)}
                placeholder="When should this SOP be followed?"
                rows={3}
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="sop-when-not">When Not to Use</label>
              <textarea
                id="sop-when-not"
                className="form-control"
                value={formData.when_not_to_use}
                onChange={(e) => handleFieldChange('when_not_to_use', e.target.value)}
                placeholder="When is this SOP NOT applicable?"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Workflow Section - Block Editor */}
        <div className="sop-editor-section">
          <h3>Standard Workflow</h3>
          <p className="section-description">
            Step-by-step instructions for completing this procedure.
          </p>
          <BlockEditor
            value={formData.standard_workflow}
            onChange={(data) => handleFieldChange('standard_workflow', data)}
            placeholder="Enter the standard workflow steps..."
            minHeight={300}
          />
        </div>

        {/* Exit Points Section */}
        <div className="sop-editor-section">
          <h3>Exit Points</h3>
          <p className="section-description">
            Conditions and steps for successfully completing the procedure.
          </p>
          <BlockEditor
            value={formData.exit_points}
            onChange={(data) => handleFieldChange('exit_points', data)}
            placeholder="Define exit points..."
            minHeight={200}
          />
        </div>

        {/* Escalation Section */}
        <div className="sop-editor-section">
          <h3>Escalation</h3>
          <p className="section-description">
            When and how to escalate issues.
          </p>
          <BlockEditor
            value={formData.escalation}
            onChange={(data) => handleFieldChange('escalation', data)}
            placeholder="Define escalation procedures..."
            minHeight={200}
          />
        </div>

        {/* Transfer Section */}
        <div className="sop-editor-section">
          <h3>Transfer</h3>
          <p className="section-description">
            Procedures for transferring to other teams or departments.
          </p>
          <BlockEditor
            value={formData.transfer}
            onChange={(data) => handleFieldChange('transfer', data)}
            placeholder="Define transfer procedures..."
            minHeight={200}
          />
        </div>

        {/* Additional Information */}
        <div className="sop-editor-section">
          <h3>Additional Information</h3>
          <BlockEditor
            value={formData.additional_information}
            onChange={(data) => handleFieldChange('additional_information', data)}
            placeholder="Any additional notes or resources..."
            minHeight={200}
          />
        </div>

        {/* Change Notes */}
        <div className="sop-editor-section">
          <h3>Change Notes</h3>
          <div className="form-group">
            <textarea
              className="form-control"
              value={formData.change_notes}
              onChange={(e) => handleFieldChange('change_notes', e.target.value)}
              placeholder="Describe what changed in this version..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="sop-editor-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                {sopId ? 'Save Changes' : 'Create SOP'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
