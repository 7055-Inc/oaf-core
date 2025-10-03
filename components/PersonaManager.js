import { useState, useEffect } from 'react';
import styles from './PersonaManager.module.css';
import { getApiUrl } from '../lib/config';

export default function PersonaManager() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [newPersona, setNewPersona] = useState({
    persona_name: '',
    display_name: '',
    bio: '',
    specialty: '',
    portfolio_url: '',
    website_url: '',
    instagram_handle: '',
    facebook_url: '',
    profile_image_url: '',
    is_default: false
  });

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('api/personas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch personas');
      }

      const data = await response.json();
      setPersonas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPersona(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      if (!newPersona.persona_name.trim()) {
        setError('Persona name is required');
        return;
      }

      if (!newPersona.display_name.trim()) {
        setError('Display name is required');
        return;
      }

      const token = localStorage.getItem('token');
      const url = editingPersona 
        ? `api/personas/${editingPersona.id}`
        : 'api/personas';
      
      const method = editingPersona ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPersona)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save persona');
      }

      await fetchPersonas();
      handleCancel();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona);
    setNewPersona({
      persona_name: persona.persona_name,
      display_name: persona.display_name,
      bio: persona.bio || '',
      specialty: persona.specialty || '',
      portfolio_url: persona.portfolio_url || '',
      website_url: persona.website_url || '',
      instagram_handle: persona.instagram_handle || '',
      facebook_url: persona.facebook_url || '',
      profile_image_url: persona.profile_image_url || '',
      is_default: persona.is_default
    });
    setShowCreateForm(true);
  };

  const handleSetDefault = async (personaId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`api/personas/${personaId}/set-default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to set default persona');
      }

      await fetchPersonas();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (personaId) => {
    if (!confirm('Are you sure you want to delete this persona? This cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`api/personas/${personaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete persona');
      }

      await fetchPersonas();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingPersona(null);
    setNewPersona({
      persona_name: '',
      display_name: '',
      bio: '',
      specialty: '',
      portfolio_url: '',
      website_url: '',
      instagram_handle: '',
      facebook_url: '',
      profile_image_url: '',
      is_default: false
    });
    setError(null);
  };

  if (loading) {
    return <div className={styles.loading}>Loading personas...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Artist Personas</h2>
        <p className={styles.description}>
          Create multiple professional identities to showcase different aspects of your artistic practice.
        </p>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
        >
          <i className="fas fa-plus"></i>
          Create New Persona
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className={styles.formModal}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h3>{editingPersona ? 'Edit Persona' : 'Create New Persona'}</h3>
              <button
                className={styles.closeButton}
                onClick={handleCancel}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="persona_name">
                    Persona Name *
                  </label>
                  <input
                    type="text"
                    id="persona_name"
                    name="persona_name"
                    value={newPersona.persona_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Wildlife Photographer, Abstract Artist"
                    className={styles.input}
                    required
                  />
                  <div className={styles.inputHelp}>Internal name for your reference</div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="display_name">
                    Public Display Name *
                  </label>
                  <input
                    type="text"
                    id="display_name"
                    name="display_name"
                    value={newPersona.display_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Sarah Johnson Wildlife Photography"
                    className={styles.input}
                    required
                  />
                  <div className={styles.inputHelp}>Name shown to event organizers and public</div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="specialty">
                  Art Specialty/Medium
                </label>
                <input
                  type="text"
                  id="specialty"
                  name="specialty"
                  value={newPersona.specialty}
                  onChange={handleInputChange}
                  placeholder="e.g., Digital Photography, Oil Painting, Sculpture"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bio">
                  Artist Bio/Statement
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={newPersona.bio}
                  onChange={handleInputChange}
                  placeholder="Describe this artistic identity and practice..."
                  rows={4}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="portfolio_url">
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    id="portfolio_url"
                    name="portfolio_url"
                    value={newPersona.portfolio_url}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="website_url">
                    Personal Website
                  </label>
                  <input
                    type="url"
                    id="website_url"
                    name="website_url"
                    value={newPersona.website_url}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="instagram_handle">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    id="instagram_handle"
                    name="instagram_handle"
                    value={newPersona.instagram_handle}
                    onChange={handleInputChange}
                    placeholder="username (without @)"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="facebook_url">
                    Facebook Page/Profile
                  </label>
                  <input
                    type="url"
                    id="facebook_url"
                    name="facebook_url"
                    value={newPersona.facebook_url}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/your-page"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="profile_image_url">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  id="profile_image_url"
                  name="profile_image_url"
                  value={newPersona.profile_image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/profile-image.jpg"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={newPersona.is_default}
                    onChange={handleInputChange}
                    className={styles.checkbox}
                  />
                  Set as Default Persona
                </label>
                <div className={styles.inputHelp}>Use this persona by default when applying to events</div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSave}
                >
                  {editingPersona ? 'Update Persona' : 'Create Persona'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personas List */}
      <div className={styles.personasList}>
        {personas.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <i className="fas fa-user-friends"></i>
            </div>
            <h3>No Personas Yet</h3>
            <p>Create your first persona to organize different aspects of your artistic practice.</p>
            <button
              className={styles.createButton}
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Persona
            </button>
          </div>
        ) : (
          <div className={styles.personasGrid}>
            {personas.map(persona => (
              <div key={persona.id} className={`${styles.personaCard} ${persona.is_default ? styles.defaultPersona : ''}`}>
                <div className={styles.personaHeader}>
                  <div className={styles.personaInfo}>
                    <h3>{persona.display_name}</h3>
                    <p className={styles.personaName}>{persona.persona_name}</p>
                    {persona.specialty && (
                      <p className={styles.personaSpecialty}>{persona.specialty}</p>
                    )}
                  </div>
                  {persona.is_default && (
                    <div className={styles.defaultBadge}>
                      <i className="fas fa-star"></i>
                      Default
                    </div>
                  )}
                </div>

                {persona.bio && (
                  <div className={styles.personaBio}>
                    <p>{persona.bio.substring(0, 120)}{persona.bio.length > 120 ? '...' : ''}</p>
                  </div>
                )}

                <div className={styles.personaLinks}>
                  {persona.portfolio_url && (
                    <a href={persona.portfolio_url} target="_blank" rel="noopener noreferrer" className={styles.personaLink}>
                      <i className="fas fa-images"></i> Portfolio
                    </a>
                  )}
                  {persona.website_url && (
                    <a href={persona.website_url} target="_blank" rel="noopener noreferrer" className={styles.personaLink}>
                      <i className="fas fa-globe"></i> Website
                    </a>
                  )}
                  {persona.instagram_handle && (
                    <a href={`https://instagram.com/${persona.instagram_handle}`} target="_blank" rel="noopener noreferrer" className={styles.personaLink}>
                      <i className="fab fa-instagram"></i> Instagram
                    </a>
                  )}
                </div>

                <div className={styles.personaActions}>
                  {!persona.is_default && (
                    <button
                      className={styles.setDefaultButton}
                      onClick={() => handleSetDefault(persona.id)}
                      title="Set as default"
                    >
                      <i className="fas fa-star"></i>
                    </button>
                  )}
                  <button
                    className={styles.editButton}
                    onClick={() => handleEdit(persona)}
                    title="Edit persona"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(persona.id)}
                    title="Delete persona"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 