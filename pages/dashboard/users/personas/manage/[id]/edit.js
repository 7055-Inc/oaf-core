import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../../../lib/users';
import { adminGetPersona, adminUpdatePersona } from '../../../../../../lib/users/api';

/**
 * Admin Edit Persona Page
 * Admin-only page for editing any persona
 */
export default function AdminEditPersonaPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [persona, setPersona] = useState(null);
  
  const [formData, setFormData] = useState({
    persona_name: '',
    display_name: '',
    bio: '',
    specialty: '',
    portfolio_url: '',
    website_url: '',
    instagram_handle: '',
    facebook_url: '',
    profile_image_url: '',
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      // Check admin access
      const user = await getCurrentUser();
      if (user.user_type !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      // Load persona
      const personaData = await adminGetPersona(id);
      setPersona(personaData);
      setFormData({
        persona_name: personaData.persona_name || '',
        display_name: personaData.display_name || '',
        bio: personaData.bio || '',
        specialty: personaData.specialty || '',
        portfolio_url: personaData.portfolio_url || '',
        website_url: personaData.website_url || '',
        instagram_handle: personaData.instagram_handle || '',
        facebook_url: personaData.facebook_url || '',
        profile_image_url: personaData.profile_image_url || '',
        is_default: personaData.is_default || false,
        is_active: personaData.is_active !== false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      setSaving(true);
      await adminUpdatePersona(id, formData);
      router.push('/dashboard/users/personas/manage');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading persona...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error && !persona) {
    return (
      <DashboardShell>
        <div className="error-alert">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Persona | Dashboard | Brakebee</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          <div className="dashboard-page-header">
            <h1>Edit Persona (Admin)</h1>
          </div>
          
          <div className="dashboard-page-content" style={{ maxWidth: '800px' }}>
            {persona && (
              <div className="info-alert" style={{ marginBottom: '24px' }}>
                <strong>Artist:</strong> {persona.artist_name || persona.artist_username} ({persona.artist_email})
              </div>
            )}

            {error && (
              <div className="error-alert">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Basic Info */}
              <div className="form-card">
                <h3>Basic Information</h3>
                
                <div className="form-grid-2">
                  <div>
                    <label className="required">Persona Name</label>
                    <input
                      type="text"
                      name="persona_name"
                      value={formData.persona_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="required">Display Name</label>
                    <input
                      type="text"
                      name="display_name"
                      value={formData.display_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-1">
                  <div>
                    <label>Specialty</label>
                    <input
                      type="text"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-grid-1">
                  <div>
                    <label>Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows="4"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label className="toggle-slider-container">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={formData.is_default}
                        onChange={handleChange}
                        className="toggle-slider-input"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Default Persona</span>
                    </label>
                  </div>
                  <div>
                    <label className="toggle-slider-container">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="toggle-slider-input"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Profile Image */}
              <div className="form-card">
                <h3>Profile Image</h3>
                
                <div className="form-grid-1">
                  <div>
                    <label>Profile Image URL</label>
                    <input
                      type="url"
                      name="profile_image_url"
                      value={formData.profile_image_url}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {formData.profile_image_url && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <img 
                      src={formData.profile_image_url} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '150px', 
                        maxHeight: '150px', 
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #eee'
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="form-card">
                <h3>Links & Social Media</h3>
                
                <div className="form-grid-2">
                  <div>
                    <label>Website URL</label>
                    <input
                      type="url"
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label>Portfolio URL</label>
                    <input
                      type="url"
                      name="portfolio_url"
                      value={formData.portfolio_url}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label>Instagram Handle</label>
                    <input
                      type="text"
                      name="instagram_handle"
                      value={formData.instagram_handle}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label>Facebook URL</label>
                    <input
                      type="url"
                      name="facebook_url"
                      value={formData.facebook_url}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="form-submit-section">
                <button 
                  type="button" 
                  className="secondary"
                  onClick={() => router.push('/dashboard/users/personas/manage')}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
