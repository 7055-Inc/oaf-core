/**
 * CRM - Email Collection Forms Manager
 * Dashboard > CRM > Forms
 * Create and manage email signup forms with embed codes.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { getCurrentUser } from '../../../lib/users/api';
import { fetchForms, createForm, updateForm, deleteForm, getFormEmbedCode } from '../../../lib/email-marketing/api';

export default function FormsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [embedCode, setEmbedCode] = useState(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    form_name: '',
    form_type: 'inline',
    collect_first_name: true,
    collect_last_name: false,
    form_title: '',
    form_description: '',
    submit_button_text: 'Subscribe',
    auto_tags: [],
    require_double_optin: false,
    redirect_url: '',
    primary_color: '#055474'
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userData) {
      loadForms();
    }
  }, [userData]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      setUserData(data);
    } catch (err) {
      console.error('Error loading user:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadForms = async () => {
    try {
      const data = await fetchForms();
      if (data.success) {
        setForms(data.forms || []);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  };

  const resetFormData = () => {
    setFormData({
      form_name: '',
      form_type: 'inline',
      collect_first_name: true,
      collect_last_name: false,
      form_title: '',
      form_description: '',
      submit_button_text: 'Subscribe',
      auto_tags: [],
      require_double_optin: false,
      redirect_url: '',
      primary_color: '#055474'
    });
    setTagInput('');
    setSelectedForm(null);
  };

  const openCreateModal = () => {
    resetFormData();
    setModalOpen(true);
  };

  const openEditModal = (form) => {
    setSelectedForm(form);
    setFormData({
      form_name: form.form_name,
      form_type: form.form_type || 'inline',
      collect_first_name: form.collect_first_name || false,
      collect_last_name: form.collect_last_name || false,
      form_title: form.form_title || '',
      form_description: form.form_description || '',
      submit_button_text: form.submit_button_text || 'Subscribe',
      auto_tags: form.auto_tags || [],
      require_double_optin: form.require_double_optin || false,
      redirect_url: form.redirect_url || '',
      primary_color: form.primary_color || '#055474'
    });
    setTagInput((form.auto_tags || []).join(', '));
    setModalOpen(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    try {
      if (selectedForm) {
        await updateForm(selectedForm.id, formData);
        alert('Form updated successfully!');
      } else {
        await createForm(formData);
        alert('Form created successfully!');
      }
      setModalOpen(false);
      resetFormData();
      loadForms();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteForm = async (id) => {
    if (!confirm('Delete this form? This action cannot be undone.')) return;
    try {
      await deleteForm(id);
      alert('Form deleted successfully!');
      loadForms();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleGetEmbedCode = async (formId) => {
    try {
      const data = await getFormEmbedCode(formId);
      if (data.success) {
        setEmbedCode(data);
        setEmbedModalOpen(true);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const updateTags = (value) => {
    setTagInput(value);
    const tags = value.split(',').map(t => t.trim()).filter(Boolean);
    setFormData({ ...formData, auto_tags: tags });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <>
      <Head>
        <title>CRM - Forms | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Email Collection Forms</h1>
          <p className="page-subtitle">Create signup forms for your website</p>
        </div>

        {/* Actions Bar */}
        <div style={{ marginBottom: '20px' }}>
          <button onClick={openCreateModal} style={{ padding: '12px 24px', background: '#055474', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            + Create Form
          </button>
        </div>

        {/* Forms Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {forms.map(form => (
            <div key={form.id} style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{form.form_name}</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ padding: '4px 12px', background: '#e9ecef', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                    {form.form_type}
                  </span>
                  {form.require_double_optin && (
                    <span style={{ padding: '4px 12px', background: '#d4edda', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#155724' }}>
                      Double Opt-in
                    </span>
                  )}
                </div>
                {form.form_title && (
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
                    <strong>Title:</strong> {form.form_title}
                  </div>
                )}
                {form.auto_tags && form.auto_tags.length > 0 && (
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
                    <strong>Auto Tags:</strong> {form.auto_tags.join(', ')}
                  </div>
                )}
              </div>
              <div style={{ padding: '15px', background: '#f8f9fa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#055474' }}>{form.total_submissions || 0}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Submissions</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{form.total_confirmed || 0}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Confirmed</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => openEditModal(form)} style={{ padding: '8px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Edit
                  </button>
                  <button onClick={() => handleGetEmbedCode(form.id)} style={{ padding: '8px', background: '#055474', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Get Code
                  </button>
                  <button onClick={() => handleDeleteForm(form.id)} style={{ padding: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', gridColumn: '1 / -1' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {forms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No forms yet</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>Create your first email collection form to start building your list.</p>
            <button onClick={openCreateModal} style={{ padding: '12px 24px', background: '#055474', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Create Your First Form
            </button>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {modalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <h3 style={{ margin: 0 }}>{selectedForm ? 'Edit Form' : 'Create Form'}</h3>
              </div>
              <form onSubmit={handleSaveForm}>
                <div style={{ padding: '20px' }}>
                  {/* Form Name */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Form Name *</label>
                    <input
                      type="text"
                      value={formData.form_name}
                      onChange={e => setFormData({ ...formData, form_name: e.target.value })}
                      placeholder="Newsletter Signup"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                      required
                    />
                  </div>

                  {/* Form Type */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Form Type *</label>
                    <select
                      value={formData.form_type}
                      onChange={e => setFormData({ ...formData, form_type: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                      required
                    >
                      <option value="inline">Inline (Embedded in page)</option>
                      <option value="popup">Popup (Modal overlay)</option>
                      <option value="exit_intent">Exit Intent (On leave attempt)</option>
                      <option value="embedded">Embedded (Sidebar/Footer)</option>
                    </select>
                  </div>

                  {/* Fields to Collect */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Fields to Collect</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={formData.collect_first_name}
                          onChange={e => setFormData({ ...formData, collect_first_name: e.target.checked })}
                        />
                        <span>Collect First Name</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={formData.collect_last_name}
                          onChange={e => setFormData({ ...formData, collect_last_name: e.target.checked })}
                        />
                        <span>Collect Last Name</span>
                      </label>
                    </div>
                  </div>

                  {/* Form Title */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Form Title</label>
                    <input
                      type="text"
                      value={formData.form_title}
                      onChange={e => setFormData({ ...formData, form_title: e.target.value })}
                      placeholder="Join Our Newsletter"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  {/* Form Description */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Form Description</label>
                    <textarea
                      value={formData.form_description}
                      onChange={e => setFormData({ ...formData, form_description: e.target.value })}
                      placeholder="Get exclusive updates and special offers..."
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
                    />
                  </div>

                  {/* Button Text */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Button Text</label>
                    <input
                      type="text"
                      value={formData.submit_button_text}
                      onChange={e => setFormData({ ...formData, submit_button_text: e.target.value })}
                      placeholder="Subscribe"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  {/* Auto Tags */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Auto Tags (comma separated)</label>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => updateTags(e.target.value)}
                      placeholder="newsletter, website-signup"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <small style={{ fontSize: '11px', color: '#666' }}>These tags will be automatically applied to new subscribers</small>
                  </div>

                  {/* Double Opt-in */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={formData.require_double_optin}
                        onChange={e => setFormData({ ...formData, require_double_optin: e.target.checked })}
                      />
                      <span style={{ fontWeight: 'bold' }}>Require Double Opt-in</span>
                    </label>
                    <small style={{ fontSize: '11px', color: '#666', marginLeft: '24px' }}>Send confirmation email before adding to list</small>
                  </div>

                  {/* Redirect URL */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Redirect URL (optional)</label>
                    <input
                      type="url"
                      value={formData.redirect_url}
                      onChange={e => setFormData({ ...formData, redirect_url: e.target.value })}
                      placeholder="https://yoursite.com/thank-you"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <small style={{ fontSize: '11px', color: '#666' }}>Redirect users to this page after signup</small>
                  </div>

                  {/* Primary Color */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Primary Color</label>
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                      style={{ width: '100px', height: '40px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', display: 'flex', gap: '10px', position: 'sticky', bottom: 0 }}>
                  <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {selectedForm ? 'Update Form' : 'Create Form'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Embed Code Modal */}
        {embedModalOpen && embedCode && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '8px', width: '700px', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
                <h3 style={{ margin: 0 }}>Embed Code</h3>
              </div>
              <div style={{ padding: '20px' }}>
                {/* HTML Embed */}
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ marginBottom: '10px' }}>HTML Embed (For any website)</h4>
                  <div style={{ position: 'relative' }}>
                    <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto', fontSize: '12px', margin: 0 }}>
                      <code>{embedCode.html_embed}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(embedCode.html_embed)}
                      style={{ position: 'absolute', top: '10px', right: '10px', padding: '8px 16px', background: '#055474', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* React Embed */}
                <div>
                  <h4 style={{ marginBottom: '10px' }}>React Component</h4>
                  <div style={{ position: 'relative' }}>
                    <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto', fontSize: '12px', margin: 0 }}>
                      <code>{embedCode.react_embed}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(embedCode.react_embed)}
                      style={{ position: 'absolute', top: '10px', right: '10px', padding: '8px 16px', background: '#055474', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa' }}>
                <button onClick={() => setEmbedModalOpen(false)} style={{ width: '100%', padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
