import { useState } from 'react';
import { useEventForm } from '../EventFormContext';

export function getApplicationSummary(formData, applicationFields, availableAddons) {
  if (!formData.allow_applications) return 'Applications disabled';
  const parts = [];
  if (formData.application_fee > 0) parts.push(`$${formData.application_fee} app fee`);
  if (formData.booth_fee > 0) parts.push(`$${formData.booth_fee} booth fee`);
  if (applicationFields?.length > 0) parts.push(`${applicationFields.length} custom fields`);
  if (availableAddons?.length > 0) parts.push(`${availableAddons.length} add-ons`);
  return parts.length > 0 ? parts.join(', ') : 'No fees set';
}

export default function ApplicationSection() {
  const { 
    formData, 
    updateField,
    basicFields,
    standardMediaFields,
    applicationFields,
    availableAddons,
    handleBasicFieldChange,
    handleMediaFieldChange,
    addApplicationField,
    removeApplicationField,
    updateApplicationField,
    addAddon,
    removeAddon,
    updateAddon
  } = useEventForm();

  const [newField, setNewField] = useState({
    field_type: 'text',
    field_name: '',
    field_description: '',
    is_required: false,
    verified_can_skip: false
  });

  const [newAddon, setNewAddon] = useState({
    addon_name: '',
    addon_description: '',
    addon_price: ''
  });

  const handleAddField = () => {
    if (!newField.field_name.trim()) return;
    addApplicationField(newField);
    setNewField({
      field_type: 'text',
      field_name: '',
      field_description: '',
      is_required: false,
      verified_can_skip: false
    });
  };

  const handleAddAddon = () => {
    if (!newAddon.addon_name || !newAddon.addon_price) return;
    addAddon(newAddon);
    setNewAddon({
      addon_name: '',
      addon_description: '',
      addon_price: ''
    });
  };

  if (!formData.allow_applications) {
    return (
      <div className="warning-alert" style={{ display: 'flex', gap: '12px' }}>
        <i className="fas fa-info-circle" style={{ fontSize: '24px' }}></i>
        <div>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Applications are disabled</strong>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Enable "Allow Artists to Apply Online" in the Settings section to configure application requirements.
          </p>
        </div>
      </div>
    );
  }

  const basicFieldLabels = {
    company_name: 'Company/Business Name',
    email: 'Email Address',
    address: 'Mailing Address',
    phone: 'Phone Number',
    artist_statement: 'Artist Statement',
    portfolio_url: 'Portfolio URL (Auto-filled)',
    additional_info: 'Additional Information',
    additional_notes: 'Additional Notes'
  };

  const mediaFieldLabels = {
    works_in_progress_1: 'Works in Progress #1',
    works_in_progress_2: 'Works in Progress #2',
    art_1: 'Art Sample #1',
    art_2: 'Art Sample #2',
    art_3: 'Art Sample #3',
    booth_1: 'Booth Setup Photo #1',
    booth_2: 'Booth Setup Photo #2'
  };

  return (
    <div>
      {/* Application Fees */}
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Application Fees</h4>
        <div className="form-grid-3">
          <div>
            <label>Application Fee</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
              <input
                type="number"
                value={formData.application_fee}
                onChange={(e) => updateField('application_fee', e.target.value)}
                step="0.01"
                min="0"
                placeholder="0.00"
                style={{ paddingLeft: '24px' }}
              />
            </div>
          </div>
          <div>
            <label>Jury Fee</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
              <input
                type="number"
                value={formData.jury_fee}
                onChange={(e) => updateField('jury_fee', e.target.value)}
                step="0.01"
                min="0"
                placeholder="0.00"
                style={{ paddingLeft: '24px' }}
              />
            </div>
          </div>
          <div>
            <label>Booth Fee</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
              <input
                type="number"
                value={formData.booth_fee}
                onChange={(e) => updateField('booth_fee', e.target.value)}
                step="0.01"
                min="0"
                placeholder="0.00"
                style={{ paddingLeft: '24px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Application Timeline */}
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Application Timeline</h4>
        <div className="form-grid-3">
          <div>
            <label>Application Deadline</label>
            <input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => updateField('application_deadline', e.target.value)}
            />
          </div>
          <div>
            <label>Jury Date</label>
            <input
              type="date"
              value={formData.jury_date}
              onChange={(e) => updateField('jury_date', e.target.value)}
            />
          </div>
          <div>
            <label>Notification Date</label>
            <input
              type="date"
              value={formData.notification_date}
              onChange={(e) => updateField('notification_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Basic Application Fields */}
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Basic Application Fields</h4>
        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 12px 0' }}>
          Configure which standard fields to include in applications
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {Object.entries(basicFields).map(([fieldName, state]) => (
            <div key={fieldName} className="form-card" style={{ margin: 0 }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px' }}>{basicFieldLabels[fieldName]}</strong>
                {fieldName === 'email' && <span style={{ fontSize: '11px', color: '#888', marginLeft: '4px' }}>(Always Required)</span>}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.included}
                    onChange={(e) => handleBasicFieldChange(fieldName, 'included', e.target.checked)}
                    disabled={fieldName === 'email'}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Include
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', opacity: state.included ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={state.required}
                    onChange={(e) => handleBasicFieldChange(fieldName, 'required', e.target.checked)}
                    disabled={fieldName === 'email' || !state.included}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Required
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', opacity: state.included && state.required ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={state.verifiedCanSkip}
                    onChange={(e) => handleBasicFieldChange(fieldName, 'verifiedCanSkip', e.target.checked)}
                    disabled={fieldName === 'email' || !state.included || !state.required}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Verified can skip
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Media Fields */}
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Standard Media Fields</h4>
        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 12px 0' }}>
          Configure which image uploads to request from artists
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {Object.entries(standardMediaFields).map(([fieldName, state]) => (
            <div key={fieldName} className="form-card" style={{ margin: 0 }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px' }}>{mediaFieldLabels[fieldName]}</strong>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.included}
                    onChange={(e) => handleMediaFieldChange(fieldName, 'included', e.target.checked)}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Include
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', opacity: state.included ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={state.required}
                    onChange={(e) => handleMediaFieldChange(fieldName, 'required', e.target.checked)}
                    disabled={!state.included}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Required
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', opacity: state.included && state.required ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={state.verifiedCanSkip}
                    onChange={(e) => handleMediaFieldChange(fieldName, 'verifiedCanSkip', e.target.checked)}
                    disabled={!state.included || !state.required}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Verified can skip
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Application Fields */}
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Custom Application Fields</h4>
        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 12px 0' }}>
          Add your own custom fields for applicants to fill out
        </p>
        
        {applicationFields.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {applicationFields.map(field => (
              <div key={field.id} className="form-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <select
                    value={field.field_type}
                    onChange={(e) => updateApplicationField(field.id, 'field_type', e.target.value)}
                    style={{ width: '120px' }}
                  >
                    <option value="text">Text Field</option>
                    <option value="textarea">Text Area</option>
                    <option value="image">Image Upload</option>
                    <option value="video">Video Upload</option>
                  </select>
                  <input
                    type="text"
                    value={field.field_name}
                    onChange={(e) => updateApplicationField(field.id, 'field_name', e.target.value)}
                    placeholder="Field name"
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="secondary"
                    onClick={() => removeApplicationField(field.id)}
                    style={{ padding: '6px 12px' }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={field.field_description || ''}
                    onChange={(e) => updateApplicationField(field.id, 'field_description', e.target.value)}
                    placeholder="Description (optional)"
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={field.is_required}
                      onChange={(e) => updateApplicationField(field.id, 'is_required', e.target.checked)}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    Required
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={field.verified_can_skip}
                      onChange={(e) => updateApplicationField(field.id, 'verified_can_skip', e.target.checked)}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    Verified can skip
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={newField.field_type}
            onChange={(e) => setNewField(prev => ({ ...prev, field_type: e.target.value }))}
            style={{ width: '120px' }}
          >
            <option value="text">Text Field</option>
            <option value="textarea">Text Area</option>
            <option value="image">Image Upload</option>
            <option value="video">Video Upload</option>
          </select>
          <input
            type="text"
            value={newField.field_name}
            onChange={(e) => setNewField(prev => ({ ...prev, field_name: e.target.value }))}
            placeholder="Field name (e.g., Business License)"
            style={{ flex: 1, minWidth: '200px' }}
          />
          <button type="button" onClick={handleAddField} disabled={!newField.field_name.trim()}>
            Add Field
          </button>
        </div>
      </div>

      {/* Booth Package Add-ons */}
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Booth Package Add-ons</h4>
        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 12px 0' }}>
          Define optional add-ons artists can request (Corner Booth, Extra Tables, etc.)
        </p>
        
        {availableAddons.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {availableAddons.map(addon => (
              <div key={addon.id} className="form-card" style={{ margin: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={addon.addon_name}
                  onChange={(e) => updateAddon(addon.id, 'addon_name', e.target.value)}
                  placeholder="Add-on name"
                  style={{ flex: 1, minWidth: '150px' }}
                />
                <input
                  type="text"
                  value={addon.addon_description}
                  onChange={(e) => updateAddon(addon.id, 'addon_description', e.target.value)}
                  placeholder="Description"
                  style={{ flex: 1.5, minWidth: '200px' }}
                />
                <div style={{ position: 'relative', width: '100px' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
                  <input
                    type="number"
                    value={addon.addon_price}
                    onChange={(e) => updateAddon(addon.id, 'addon_price', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    style={{ paddingLeft: '24px' }}
                  />
                </div>
                <button 
                  type="button" 
                  className="secondary"
                  onClick={() => removeAddon(addon.id)}
                  style={{ padding: '6px 12px' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newAddon.addon_name}
            onChange={(e) => setNewAddon(prev => ({ ...prev, addon_name: e.target.value }))}
            placeholder="Add-on name (e.g., Corner Booth)"
            style={{ flex: 1, minWidth: '150px' }}
          />
          <input
            type="text"
            value={newAddon.addon_description}
            onChange={(e) => setNewAddon(prev => ({ ...prev, addon_description: e.target.value }))}
            placeholder="Description"
            style={{ flex: 1, minWidth: '150px' }}
          />
          <div style={{ position: 'relative', width: '100px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
            <input
              type="number"
              value={newAddon.addon_price}
              onChange={(e) => setNewAddon(prev => ({ ...prev, addon_price: e.target.value }))}
              step="0.01"
              min="0"
              placeholder="Price"
              style={{ paddingLeft: '24px' }}
            />
          </div>
          <button 
            type="button" 
            onClick={handleAddAddon}
            disabled={!newAddon.addon_name || !newAddon.addon_price}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
