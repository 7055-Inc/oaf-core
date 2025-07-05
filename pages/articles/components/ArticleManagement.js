import React, { useState, useEffect } from 'react';
import WYSIWYGEditor from '../../../components/WYSIWYGEditor';
import { authenticatedApiRequest, secureApiRequest } from '../../../lib/csrf';
import styles from './ArticleManagement.module.css';

const ArticleManagement = () => {
  const [articles, setArticles] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state for article creation/editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    featured_image: '',
    topic_ids: [],
    // SEO fields
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    twitter_title: '',
    twitter_description: '',
    twitter_image: ''
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
      const response = await fetch('https://api2.onlineartfestival.com/users/me', {
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
      
      setPermissions({
        can_create: isAdmin || userPermissions.includes('create_articles'),
        can_publish: isAdmin || userPermissions.includes('publish_articles'),
        can_manage_seo: isAdmin || userPermissions.includes('manage_articles_seo'),
        can_manage_topics: isAdmin || userPermissions.includes('manage_articles_topics')
      });
    } catch (err) {
      console.error('Error checking permissions:', err);
    }
  };

  // Load articles from API
  const loadArticles = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/articles', {
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
      const response = await secureApiRequest('https://api2.onlineartfestival.com/api/topics');
      if (!response.ok) {
        throw new Error(`Failed to load topics: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Ensure topics is always an array
      setTopics(Array.isArray(data) ? data : []);
    } catch (err) {
      setTopics([]); // Ensure topics is always an array
      console.error('Error loading topics:', err);
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/articles', {
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/articles/${selectedArticle.id}`, {
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/articles/${articleId}`, {
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
      featured_image: '',
      topic_ids: [],
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_title: '',
      og_description: '',
      og_image: '',
      twitter_title: '',
      twitter_description: '',
      twitter_image: ''
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
      featured_image: article.featured_image || '',
      topic_ids: article.topic_ids || [],
      meta_title: article.meta_title || '',
      meta_description: article.meta_description || '',
      meta_keywords: article.meta_keywords || '',
      og_title: article.og_title || '',
      og_description: article.og_description || '',
      og_image: article.og_image || '',
      twitter_title: article.twitter_title || '',
      twitter_description: article.twitter_description || '',
      twitter_image: article.twitter_image || ''
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
    return <div className={styles.loading}>Loading articles...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Article Management</h2>
        <div className={styles.headerActions}>
          {permissions.can_create && (
            <button 
              className={styles.primaryButton}
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
              className={styles.secondaryButton}
              onClick={() => setActiveView('list')}
            >
              Back to List
            </button>
          )}
        </div>
      </div>

      {/* Article List View */}
      {activeView === 'list' && (
        <div className={styles.listView}>
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
                    className={styles.primaryButton}
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
              
              <div className={styles.formGroup}>
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

              <div className={styles.formGroup}>
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
                <div className={styles.formGroup}>
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

                <div className={styles.formGroup}>
                  <label>Featured Image URL</label>
                  <input
                    type="url"
                    name="featured_image"
                    value={formData.featured_image}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>
              </div>

              {/* Topics */}
              {permissions.can_manage_topics && topics.length > 0 && (
                <div className={styles.formGroup}>
                  <label>Topics</label>
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
                </div>
              )}
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

            {/* SEO Section */}
            {permissions.can_manage_seo && (
              <div className={styles.formSection}>
                <div className={styles.seoHeader}>
                  <h3>SEO Settings</h3>
                  <button 
                    type="button"
                    className={styles.secondaryButton}
                    onClick={generateSEOFields}
                  >
                    Auto-Generate SEO
                  </button>
                </div>

                <div className={styles.formGroup}>
                  <label>Meta Title</label>
                  <input
                    type="text"
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Meta Description</label>
                  <textarea
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleInputChange}
                    className={styles.formTextarea}
                    rows="3"
                  />
                </div>

                <div className={styles.formGroup}>
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

                <div className={styles.formGroup}>
                  <label>OpenGraph Title</label>
                  <input
                    type="text"
                    name="og_title"
                    value={formData.og_title}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>OpenGraph Description</label>
                  <textarea
                    name="og_description"
                    value={formData.og_description}
                    onChange={handleInputChange}
                    className={styles.formTextarea}
                    rows="3"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>OpenGraph Image URL</label>
                  <input
                    type="url"
                    name="og_image"
                    value={formData.og_image}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>
                {activeView === 'create' ? 'Create Article' : 'Update Article'}
              </button>
              <button 
                type="button" 
                className={styles.secondaryButton}
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