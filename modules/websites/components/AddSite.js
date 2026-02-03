import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createSite } from '../../../lib/websites';
import { getSubdomainBase } from '../../../lib/config';

export default function AddSite() {
  const router = useRouter();
  const [form, setForm] = useState({ site_name: '', subdomain: '', site_title: '', site_description: '' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setProcessing(true);
    try {
      await createSite({
        site_name: form.site_name,
        subdomain: form.subdomain,
        site_title: form.site_title || form.site_name,
        site_description: form.site_description || '',
        theme_name: 'default'
      });
      router.push('/dashboard/websites/mine');
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="form-card">
      <h3>Create new website</h3>
      <p className="form-help" style={{ marginBottom: '20px' }}>Choose a name and subdomain. You can add a custom domain later from the site manage page.</p>
      {error && <div className="error-alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>Site name *</label>
          <input type="text" className="form-input" required value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} placeholder="My Art Portfolio" />
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>Subdomain *</label>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <input type="text" className="form-input" required value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="myportfolio" pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$" minLength={3} maxLength={63} style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
            <span style={{ padding: '8px 12px', background: '#e9ecef', border: '1px solid #ced4da', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: '14px', color: '#495057', display: 'flex', alignItems: 'center' }}>.{getSubdomainBase()}</span>
          </div>
          <span className="form-help">3-63 characters, letters, numbers, hyphens only</span>
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>Site title (browser tab)</label>
          <input type="text" className="form-input" value={form.site_title} onChange={(e) => setForm({ ...form, site_title: e.target.value })} placeholder="Artist Portfolio" />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Site description (SEO)</label>
          <textarea className="form-input" rows={3} value={form.site_description} onChange={(e) => setForm({ ...form, site_description: e.target.value })} placeholder="A portfolio showcasing my artwork..." />
        </div>
        <div className="content-action-buttons">
          <button type="submit" className="primary" disabled={processing}>{processing ? 'Creating...' : 'Create website'}</button>
          <Link href="/dashboard/websites/mine" className="secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
