import React, { useState, useEffect } from 'react';
import WYSIWYGEditor from '../../../../components/WYSIWYGEditor';
import { authenticatedApiRequest, secureApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

const ArticleManagement = () => {
  const [articles, setArticles] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tags, setTags] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states for creating new items
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [showNewSeriesForm, setShowNewSeriesForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  
  // Form state for article creation/editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    page_type: 'article', // New field
    featured_image: '',
    topic_ids: [],
    tag_ids: [], // New field
    series_id: '', // New field
    position_in_series: '', // New field
    // SEO fields
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    twitter_title: '',
    twitter_description: '',
    twitter_image: '',
    // Access control fields
    restricted_user_types: [],
    required_permissions: [],
    access_logic: 'any_of' // 'any_of' or 'must_meet_all'
  });

  const [permissions, setPermissions] = useState({
    can_create: false,
    can_publish: false,
    can_manage_seo: false,
    can_manage_topics: false
  });

  // Load articles and topics on component mount
  useEffect(() => {
    loadArticles();
    loadTopics();
    loadTags();
    loadSeries();
    checkPermissions();
  }, []);

  // Check user permissions
  const checkPermissions = async () => {
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userPermissions = payload.permissions || [];
      
      // Fetch user data from API to get user_type
      const response = await fetch(getApiUrl('users/me'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      const isAdmin = userData.user_type === 'admin';
      const canManageContent = isAdmin || userPermissions.includes('manage_content');
      
      setPermissions({
        can_create: canManageContent,
        can_publish: canManageContent,
        can_manage_seo: canManageContent,
        can_manage_topics: canManageContent
      });
    } catch (err) {
      console.error('Error checking permissions:', err);
    }
  };

  // Load articles from API
  const loadArticles = async () => {
    try {
      const response = await authApiRequest('api/articles', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load articles: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Extract articles from API response
      const articlesArray = data.articles || [];
      setArticles(Array.isArray(articlesArray) ? articlesArray : []);
    } catch (err) {
      setError(err.message);
      setArticles([]); // Ensure articles is always an array
      console.error('Error loading articles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load topics from API
  const loadTopics = async () => {
    try {
      const response = await authApiRequest('api/articles/topics');
      if (!response.ok) {
        throw new Error(`Failed to load topics: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Topics API response:', data); // Debug log
      
      // Handle both possible response formats
      const topicsArray = data.topics || data || [];
      console.log('Setting topics:', topicsArray); // Debug log
      
      setTopics(Array.isArray(topicsArray) ? topicsArray : []);
    } catch (err) {
      setTopics([]); // Ensure topics is always an array
      console.error('Error loading topics:', err);
    }
  };

  // Load tags from API
  const loadTags = async () => {
    try {
      const response = await authApiRequest('api/articles/tags');
      if (!response.ok) {
        throw new Error(`Failed to load tags: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTags(Array.isArray(data) ? data : []);
    } catch (err) {
      setTags([]);
      console.error('Error loading tags:', err);
    }
  };

  // Load series from API
  const loadSeries = async () => {
    try {
      const response = await authApiRequest('api/articles/series');
      if (!response.ok) {
        throw new Error(`Failed to load series: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setSeries(Array.isArray(data.series) ? data.series : []);
    } catch (err) {
      setSeries([]);
      console.error('Error loading series:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle topic selection
  const handleTopicChange = (topicId) => {
    setFormData(prev => ({
      ...prev,
      topic_ids: prev.topic_ids.includes(topicId)
        ? prev.topic_ids.filter(id => id !== topicId)
        : [...prev.topic_ids, topicId]
    }));
  };

  // Handle tag selection
  const handleTagChange = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }));
  };

  // Handle user type restrictions
  const handleUserTypeRestriction = (userType) => {
    setFormData(prev => ({
      ...prev,
      restricted_user_types: prev.restricted_user_types.includes(userType)
        ? prev.restricted_user_types.filter(type => type !== userType)
        : [...prev.restricted_user_types, userType]
    }));
  };

  // Handle permission requirements
  const handlePermissionRequirement = (permission) => {
    setFormData(prev => ({
      ...prev,
      required_permissions: prev.required_permissions.includes(permission)
        ? prev.required_permissions.filter(perm => perm !== permission)
        : [...prev.required_permissions, permission]
    }));
  };

  // Create new topic
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      const response = await authApiRequest('api/articles/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTopicName.trim(),
          description: `Topic: ${newTopicName.trim()}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        await loadTopics(); // Reload topics
        setNewTopicName('');
        setShowNewTopicForm(false);
        
        // Auto-select the new topic
        setFormData(prev => ({
          ...prev,
          topic_ids: [...prev.topic_ids, result.topic.id]
        }));
      } else {
        throw new Error('Failed to create topic');
      }
    } catch (err) {
      console.error('Error creating topic:', err);
      setError('Failed to create topic');
    }
  };

  // Create new tag
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const response = await authApiRequest('api/articles/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_name: newTagName.trim()
        })
      });

      if (response.ok) {
        const newTag = await response.json();
        await loadTags(); // Reload tags
        setNewTagName('');
        setShowNewTagForm(false);
        
        // Auto-select the new tag
        setFormData(prev => ({
          ...prev,
          tag_ids: [...prev.tag_ids, newTag.id]
        }));
      } else {
        throw new Error('Failed to create tag');
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('Failed to create tag');
    }
  };

  // Create new series
  const handleCreateSeries = async (e) => {
    e.preventDefault();
    if (!newSeriesName.trim()) return;

    try {
      // Note: This endpoint might need to be created if it doesn't exist
      const response = await authApiRequest('api/articles/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_name: newSeriesName.trim(),
          description: `Article series: ${newSeriesName.trim()}`
        })
      });

      if (response.ok) {
        const newSeries = await response.json();
        await loadSeries(); // Reload series
        setNewSeriesName('');
        setShowNewSeriesForm(false);
        
        // Auto-select the new series
        setFormData(prev => ({
          ...prev,
          series_id: newSeries.id || newSeries.series?.id
        }));
      } else {
        throw new Error('Failed to create series');
      }
    } catch (err) {
      console.error('Error creating series:', err);
      setError('Failed to create series - you may need to create article series through a different interface');
    }
  };

  // Handle content change from WYSIWYG editor
  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content: content
    }));
  };

  // Auto-generate SEO fields
  const generateSEOFields = () => {
    const { title, content, excerpt } = formData;
    
    // Generate meta description from excerpt or content (with null checks)
    let metaDescription = '';
    if (excerpt) {
      metaDescription = excerpt;
    } else if (content && typeof content === 'string') {
      metaDescription = content.replace(/<[^>]*>/g, '').substring(0, 160) + '...';
    } else {
      metaDescription = title ? title.substring(0, 160) : '';
    }
    
    setFormData(prev => ({
      ...prev,
      meta_title: title || '',
      meta_description: metaDescription,
      og_title: title || '',
      og_description: metaDescription,
      twitter_title: title || '',
      twitter_description: metaDescription
    }));
  };

  // Handle article creation
  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      const response = await authApiRequest('api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create article');
      }

      const newArticle = await response.json();
      setArticles(prev => [newArticle, ...prev]);
      resetForm();
      setActiveView('list');
    } catch (err) {
      setError(err.message);
      console.error('Error creating article:', err);
    }
  };

  // Handle article update
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const response = await authApiRequest(`api/articles/${selectedArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update article');
      }

      const updatedArticle = await response.json();
      setArticles(prev => prev.map(article => 
        article.id === updatedArticle.id ? updatedArticle : article
      ));
      resetForm();
      setActiveView('list');
    } catch (err) {
      setError(err.message);
      console.error('Error updating article:', err);
    }
  };

  // Handle article deletion
  const handleDelete = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this article?')) {
      return;
    }

    try {
      const response = await authApiRequest(`api/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete article');
      }

      setArticles(prev => prev.filter(article => article.id !== articleId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting article:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      status: 'draft',
      page_type: 'article',
      featured_image: '',
      topic_ids: [],
      tag_ids: [],
      series_id: '',
      position_in_series: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_title: '',
      og_description: '',
      og_image: '',
      twitter_title: '',
      twitter_description: '',
      twitter_image: '',
      restricted_user_types: [],
      required_permissions: [],
      access_logic: 'any_of'
    });
    setSelectedArticle(null);
  };

  // Start editing an article
  const startEdit = (article) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      status: article.status || 'draft',
      page_type: article.page_type || 'article',
      featured_image: article.featured_image || '',
      topic_ids: article.topic_ids || [],
      tag_ids: article.tag_ids || [],
      series_id: article.series_id || '',
      position_in_series: article.position_in_series || '',
      meta_title: article.meta_title || '',
      meta_description: article.meta_description || '',
      meta_keywords: article.meta_keywords || '',
      og_title: article.og_title || '',
      og_description: article.og_description || '',
      og_image: article.og_image || '',
      twitter_title: article.twitter_title || '',
      twitter_description: article.twitter_description || '',
      twitter_image: article.twitter_image || '',
      // TODO: Load these from API when editing
      restricted_user_types: article.restricted_user_types || [],
      required_permissions: article.required_permissions || [],
      access_logic: article.access_logic || 'any_of'
    });
    setActiveView('edit');
  };

  // Filter articles - ensure articles is always an array
  const filteredArticles = (Array.isArray(articles) ? articles : []).filter(article => {
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      (article.title && article.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return <div className="loading-state">Loading articles...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  return (
    <div className="section-box">
      {/* Header */}
      <div className="section-header">
        <h2>My Articles & Pages</h2>
        <div>
          {permissions.can_create && (
            <button 
              className="primary"
              onClick={() => {
                resetForm();
                setActiveView('create');
              }}
            >
              Create New Article
            </button>
          )}
          {activeView !== 'list' && (
            <button 
              className="secondary"
              onClick={() => setActiveView('list')}
            >
              Back to List
            </button>
          )}
        </div>
      </div>

      {/* Article List View */}
      {activeView === 'list' && (
        <div className="form-card">
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Articles</option>
                <option value="draft">Draft</option>
                <option value="ready_to_publish">Ready to Publish</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Articles Table */}
          <div className={styles.articlesTable}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Created</th>
                  <th>Views</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map(article => (
                  <tr key={article.id}>
                    <td>
                      <div className={styles.articleTitle}>
                        <strong>{article.title}</strong>
                        {article.excerpt && (
                          <p className={styles.excerpt}>{article.excerpt}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[article.status || 'draft']}`}>
                        {(article.status || 'draft').replace('_', ' ')}
                      </span>
                    </td>
                    <td>{article.author_display_name || article.author_username || 'Unknown'}</td>
                    <td>{formatDate(article.created_at)}</td>
                    <td>{article.view_count || 0}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {article.status === 'published' && article.slug && (
                          <a 
                            href={`/articles/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.viewButton}
                            title="View published article"
                          >
                            View
                          </a>
                        )}
                        <button 
                          className={styles.editButton}
                          onClick={() => startEdit(article)}
                        >
                          Edit
                        </button>
                        <button 
                          className={styles.deleteButton}
                          onClick={() => handleDelete(article.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredArticles.length === 0 && (
              <div className={styles.emptyState}>
                <p>No articles found matching your criteria.</p>
                {permissions.can_create && (
                  <button 
                    className="primary"
                    onClick={() => {
                      resetForm();
                      setActiveView('create');
                    }}
                  >
                    Create Your First Article
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Article Creation/Edit Form */}
      {(activeView === 'create' || activeView === 'edit') && (
        <div className={styles.editorView}>
          <form onSubmit={activeView === 'create' ? handleCreate : handleUpdate}>
            {/* Basic Information */}
            <div className={styles.formSection}>
              <h3>Article Information</h3>
              
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className={styles.formInput}
                />
              </div>

              <div className="form-group">
                <label>Excerpt</label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  placeholder="Brief summary of the article..."
                  className={styles.formTextarea}
                  rows="3"
                />
              </div>

              <div className={styles.formRow}>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                  >
                    <option value="draft">Draft</option>
                    {permissions.can_publish && (
                      <>
                        <option value="ready_to_publish">Ready to Publish</option>
                        <option value="published">Published</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Page Type</label>
                  <select
                    name="page_type"
                    value={formData.page_type}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                  >
                    <option value="article">Article</option>
                    <option value="page">Page</option>
                    <option value="about">About</option>
                    <option value="services">Services</option>
                    <option value="contact">Contact</option>
                    {permissions.can_manage_seo && (
                      <option value="help_article">Help Article</option>
                    )}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className="form-group">
                  <label>Featured Image URL</label>
                  <input
                    type="url"
                    name="featured_image"
                    value={formData.featured_image}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Series</label>
                    {permissions.can_manage_seo && (
                      <button
                        type="button"
                        onClick={() => setShowNewSeriesForm(!showNewSeriesForm)}
                        className={styles.addButton}
                      >
                        + Add New Series
                      </button>
                    )}
                  </div>
                  
                  {showNewSeriesForm && (
                    <div className={styles.inlineForm}>
                      <form onSubmit={handleCreateSeries} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={newSeriesName}
                          onChange={(e) => setNewSeriesName(e.target.value)}
                          placeholder="Series name"
                          className={styles.formInput}
                          style={{ flex: 1 }}
                        />
                        <button type="submit" className="primary" style={{ padding: '8px 16px' }}>
                          Create
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowNewSeriesForm(false);
                            setNewSeriesName('');
                          }}
                          className="secondary"
                          style={{ padding: '8px 16px' }}
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  )}

                  <select
                    name="series_id"
                    value={formData.series_id}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                  >
                    <option value="">No Series</option>
                    {series.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.series_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.series_id && (
                <div className="form-group">
                  <label>Position in Series</label>
                  <input
                    type="number"
                    name="position_in_series"
                    value={formData.position_in_series}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="1, 2, 3..."
                    min="1"
                  />
                  <small className={styles.fieldHelp}>
                    Order of this article within the series
                  </small>
                </div>
              )}

              {/* Topics - Show for assignment even without management permission */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Topics (Categories)</label>
                  {permissions.can_manage_seo && (
                    <button
                      type="button"
                      onClick={() => setShowNewTopicForm(!showNewTopicForm)}
                      className={styles.addButton}
                    >
                      + Add New Topic
                    </button>
                  )}
                </div>
                
                {showNewTopicForm && (
                  <div className={styles.inlineForm}>
                    <form onSubmit={handleCreateTopic} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        placeholder="Topic name"
                        className={styles.formInput}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="primary" style={{ padding: '8px 16px' }}>
                        Create
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowNewTopicForm(false);
                          setNewTopicName('');
                        }}
                        className="secondary"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                )}

                {console.log('Rendering topics section, topics:', topics)} {/* Debug log */}
                {topics.length > 0 ? (
                  <div className={styles.topicCheckboxes}>
                    {topics.map(topic => (
                      <label key={topic.id} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={formData.topic_ids.includes(topic.id)}
                          onChange={() => handleTopicChange(topic.id)}
                        />
                        {topic.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No topics available. Topics are used to categorize articles.</p>
                    {permissions.can_manage_seo && (
                      <p><small>Use the "Add New Topic" button above to create your first topic.</small></p>
                    )}
                  </div>
                )}
                <small className={styles.fieldHelp}>
                  Select categories that best describe this article
                </small>
              </div>

              {/* Tags */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Tags</label>
                  {permissions.can_manage_seo && (
                    <button
                      type="button"
                      onClick={() => setShowNewTagForm(!showNewTagForm)}
                      className={styles.addButton}
                    >
                      + Add New Tag
                    </button>
                  )}
                </div>
                
                {showNewTagForm && (
                  <div className={styles.inlineForm}>
                    <form onSubmit={handleCreateTag} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Tag name"
                        className={styles.formInput}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="primary" style={{ padding: '8px 16px' }}>
                        Create
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowNewTagForm(false);
                          setNewTagName('');
                        }}
                        className="secondary"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                )}

                {tags.length > 0 ? (
                  <div className={styles.topicCheckboxes}>
                    {tags.map(tag => (
                      <label key={tag.id} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={formData.tag_ids.includes(tag.id)}
                          onChange={() => handleTagChange(tag.id)}
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No tags available yet. Tags help users find related articles.</p>
                    {permissions.can_manage_seo && (
                      <p><small>Use the "Add New Tag" button above to create your first tag.</small></p>
                    )}
                  </div>
                )}
                <small className={styles.fieldHelp}>
                  Select relevant tags for this article
                </small>
              </div>
            </div>

            {/* Content Editor */}
            <div className={styles.formSection}>
              <h3>Content</h3>
              <WYSIWYGEditor
                value={formData.content}
                onChange={handleContentChange}
                title="Article Content"
                height={500}
                placeholder="Write your article content here..."
                allowImageUpload={true}
                imageUploadPath="/api/articles/upload-image"
              />
            </div>

            {/* Access Control Section */}
            <div className={styles.formSection}>
              <h3>Access Control</h3>
              <p className={styles.sectionDescription}>
                Control who can view this article. Leave empty for public access.
              </p>

              <div className="form-group">
                <label>Restrict to User Types</label>
                <div className={styles.checkboxGrid}>
                  {['artist', 'promoter', 'community', 'admin'].map(userType => (
                    <label key={userType} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.restricted_user_types.includes(userType)}
                        onChange={() => handleUserTypeRestriction(userType)}
                      />
                      {userType.charAt(0).toUpperCase() + userType.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Require Permissions</label>
                <div className={styles.checkboxGrid}>
                  {['vendor', 'manage_sites', 'manage_content', 'manage_system'].map(permission => (
                    <label key={permission} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.required_permissions.includes(permission)}
                        onChange={() => handlePermissionRequirement(permission)}
                      />
                      {permission.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </label>
                  ))}
                </div>
              </div>

              {(formData.restricted_user_types.length > 0 || formData.required_permissions.length > 0) && (
                <div className="form-group">
                  <label>Access Logic</label>
                  <select
                    name="access_logic"
                    value={formData.access_logic}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                  >
                    <option value="any_of">User needs ANY of the selected criteria</option>
                    <option value="must_meet_all">User must meet ALL selected criteria</option>
                  </select>
                </div>
              )}
            </div>

            {/* SEO Section */}
            {permissions.can_manage_seo && (
              <div className={styles.formSection}>
                <div className={styles.seoHeader}>
                  <h3>SEO Settings</h3>
                  <button 
                    type="button"
                    className="secondary"
                    onClick={generateSEOFields}
                  >
                    Auto-Generate SEO
                  </button>
                </div>

                <div className="form-group">
                  <label>Meta Title</label>
                  <input
                    type="text"
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>

                <div className="form-group">
                  <label>Meta Description</label>
                  <textarea
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleInputChange}
                    className={styles.formTextarea}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Meta Keywords</label>
                  <input
                    type="text"
                    name="meta_keywords"
                    value={formData.meta_keywords}
                    onChange={handleInputChange}
                    placeholder="keyword1, keyword2, keyword3"
                    className={styles.formInput}
                  />
                </div>


              </div>
            )}

            {/* Open Graph Social Share Section */}
            <div className={styles.formSection}>
              <h3>Open Graph Social Share</h3>
              <p className={styles.sectionDescription}>
                Control how your article appears when shared on social media platforms like Facebook, LinkedIn, Discord, and more.
              </p>

              <div className="form-group">
                <label>Social Share Title</label>
                <input
                  type="text"
                  name="og_title"
                  value={formData.og_title}
                  onChange={handleInputChange}
                  placeholder="Leave empty to use article title"
                  className={styles.formInput}
                />
              </div>

              <div className="form-group">
                <label>Social Share Description</label>
                <textarea
                  name="og_description"
                  value={formData.og_description}
                  onChange={handleInputChange}
                  placeholder="Leave empty to use article excerpt"
                  className={styles.formTextarea}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Social Share Image</label>
                <input
                  type="url"
                  name="og_image"
                  value={formData.og_image}
                  onChange={handleInputChange}
                  placeholder="https://yoursite.com/share-image.jpg"
                  className={styles.formInput}
                />
                <small className={styles.fieldHelp}>
                  Recommended: 1200x630px. Used by Facebook, LinkedIn, Discord, and other platforms.
                </small>
              </div>

              {/* Twitter-specific overrides */}
              <div className="form-group">
                <label>Twitter/X Specific Overrides</label>
                <div className={styles.twitterFields}>
                  <input
                    type="text"
                    name="twitter_title"
                    value={formData.twitter_title}
                    onChange={handleInputChange}
                    placeholder="Twitter title (optional override)"
                    className={styles.formInput}
                  />
                  <textarea
                    name="twitter_description"
                    value={formData.twitter_description}
                    onChange={handleInputChange}
                    placeholder="Twitter description (optional override)"
                    className={styles.formTextarea}
                    rows="2"
                  />
                  <input
                    type="url"
                    name="twitter_image"
                    value={formData.twitter_image}
                    onChange={handleInputChange}
                    placeholder="Twitter image URL (optional override)"
                    className={styles.formInput}
                  />
                </div>
                <small className={styles.fieldHelp}>
                  Optional: Override the above fields specifically for Twitter/X. Leave empty to use the main social share settings.
                </small>
              </div>
            </div>

            {/* Form Actions */}
            <div className={styles.formActions}>
              <button type="submit" className="primary">
                {activeView === 'create' ? 'Create Article' : 'Update Article'}
              </button>
              <button 
                type="button" 
                className="secondary"
                onClick={() => setActiveView('list')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ArticleManagement; 