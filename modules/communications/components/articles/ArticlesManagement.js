import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getApiUrl } from '../../../../lib/config';
import {
  fetchArticles,
  fetchTopics,
  fetchTags,
  fetchSeries,
  createArticle,
  updateArticle,
  deleteArticle,
  createTopic,
  createTag,
  createSeries,
  uploadArticleImages
} from '../../../../lib/content';

// Dynamic import for BlockEditor to avoid SSR issues
const BlockEditor = dynamic(() => import('../../../shared/block-editor'), {
  ssr: false,
  loading: () => <div className="loading-state">Loading editor...</div>
});

export default function ArticlesManagement({ userData: propUserData }) {
  const [articles, setArticles] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tags, setTags] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'mine' (admin only)
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states for creating new items
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [showNewSeriesForm, setShowNewSeriesForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  
  // Featured image upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const featuredImageInputRef = useRef(null);
  
  // Section options based on page type (multi-select checkboxes)
  const SECTION_OPTIONS = {
    help_article: [
      { value: 'getting-started', label: 'Getting Started' },
      { value: 'account-profile', label: 'Account & Profile' },
      { value: 'orders-shipping', label: 'Orders & Shipping' },
      { value: 'returns-refunds', label: 'Returns & Refunds' },
      { value: 'events', label: 'Events' },
      { value: 'marketplace', label: 'Marketplace' },
      { value: 'payments-billing', label: 'Payments & Billing' },
      { value: 'technical', label: 'Technical' }
    ],
    article: [
      { value: 'featured', label: 'Featured' },
      { value: 'news', label: 'News' },
      { value: 'interviews', label: 'Interviews' },
      { value: 'reviews', label: 'Reviews' },
      { value: 'guides', label: 'Guides' },
      { value: 'artist-news', label: 'Artist News (Magazine)' },
      { value: 'promoter-news', label: 'Promoter News (Magazine)' },
      { value: 'community-news', label: 'Community News (Magazine)' }
    ]
  };

  // Form state for article creation/editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    page_type: 'article',
    section: [], // Array of section values (stored as JSON in DB)
    images: [], // Array of {url, is_primary, alt_text, friendly_name, order}
    topic_ids: [],
    tag_ids: [],
    series_id: '',
    position_in_series: '',
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

  // Load topics, tags, series, permissions on mount
  useEffect(() => {
    loadTopics();
    loadTags();
    loadSeries();
    checkPermissions();
  }, []);

  // Load articles on mount and when filters change
  useEffect(() => {
    loadArticles();
  }, [statusFilter, scopeFilter]);

  // Check user permissions (use prop or decode token)
  const checkPermissions = async () => {
    try {
      const userData = propUserData;
      if (!userData) return;
      const isAdmin = userData.user_type === 'admin';
      const userPermissions = userData.permissions || [];
      const canManageContent = isAdmin || userPermissions.includes('manage_content') || userPermissions.includes('sites');
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

  // Load articles from API (v2). Non-admin always see only their own; admin can choose all or mine.
  const loadArticles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (propUserData?.user_type === 'admin' && scopeFilter === 'mine') params.scope = 'mine';
      const data = await fetchArticles(params);
      const articlesArray = data.articles || [];
      setArticles(Array.isArray(articlesArray) ? articlesArray : []);
    } catch (err) {
      setError(err.message);
      setArticles([]);
      console.error('Error loading articles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load topics from API (v2)
  const loadTopics = async () => {
    try {
      const data = await fetchTopics();
      const topicsArray = data.topics || data || [];
      setTopics(Array.isArray(topicsArray) ? topicsArray : []);
    } catch (err) {
      setTopics([]);
      console.error('Error loading topics:', err);
    }
  };

  // Load tags from API (v2)
  const loadTags = async () => {
    try {
      const data = await fetchTags();
      setTags(Array.isArray(data) ? data : (data.tags || []));
    } catch (err) {
      setTags([]);
      console.error('Error loading tags:', err);
    }
  };

  // Load series from API (v2)
  const loadSeries = async () => {
    try {
      const data = await fetchSeries();
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

  // Create new topic (v2)
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    try {
      const result = await createTopic({ name: newTopicName.trim(), description: `Topic: ${newTopicName.trim()}` });
      await loadTopics();
      setNewTopicName('');
      setShowNewTopicForm(false);
      const topicId = result.topic?.id ?? result.id;
      if (topicId) setFormData(prev => ({ ...prev, topic_ids: [...prev.topic_ids, topicId] }));
    } catch (err) {
      console.error('Error creating topic:', err);
      setError('Failed to create topic');
    }
  };

  // Create new tag (v2)
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const newTag = await createTag({ tag_name: newTagName.trim() });
      await loadTags();
      setNewTagName('');
      setShowNewTagForm(false);
      const tagId = newTag.id ?? newTag.tag?.id;
      if (tagId) setFormData(prev => ({ ...prev, tag_ids: [...prev.tag_ids, tagId] }));
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('Failed to create tag');
    }
  };

  // Create new series (v2)
  const handleCreateSeries = async (e) => {
    e.preventDefault();
    if (!newSeriesName.trim()) return;
    try {
      const newSeries = await createSeries({ series_name: newSeriesName.trim(), description: `Article series: ${newSeriesName.trim()}` });
      await loadSeries();
      setNewSeriesName('');
      setShowNewSeriesForm(false);
      const seriesId = newSeries.id ?? newSeries.series?.id;
      if (seriesId) setFormData(prev => ({ ...prev, series_id: seriesId }));
    } catch (err) {
      console.error('Error creating series:', err);
      setError('Failed to create series');
    }
  };

  // Handle content change from BlockEditor
  const handleContentChange = (content) => {
    const contentToStore = typeof content === 'object' ? JSON.stringify(content) : content;
    setFormData(prev => ({
      ...prev,
      content: contentToStore
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

  // Handle article creation (v2)
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const newArticle = await createArticle(formData);
      setArticles(prev => [newArticle, ...prev]);
      resetForm();
      setActiveView('list');
    } catch (err) {
      setError(err.message);
      console.error('Error creating article:', err);
    }
  };

  // Handle article update (v2)
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updatedArticle = await updateArticle(selectedArticle.id, formData);
      setArticles(prev => prev.map(article => (article.id === updatedArticle.id ? updatedArticle : article)));
      resetForm();
      setActiveView('list');
    } catch (err) {
      setError(err.message);
      console.error('Error updating article:', err);
    }
  };

  // Handle article deletion (v2)
  const handleDelete = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await deleteArticle(articleId);
      setArticles(prev => prev.filter(article => article.id !== articleId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting article:', err);
    }
  };

  // Handle image upload (supports multiple files)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate files
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    for (const file of files) {
      if (file.size > maxFileSize) {
        setUploadError(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`File "${file.name}" is not a supported format. Please use JPEG, PNG, GIF, or WebP.`);
        return;
      }
    }

    setUploadingImage(true);
    setUploadError(null);

    try {
      const uploadFormData = new FormData();
      files.forEach(file => {
        uploadFormData.append('images', file);
      });

      const articleIdParam = selectedArticle?.id || 'new';
      const data = await uploadArticleImages(articleIdParam, uploadFormData);

      if (data.urls && Array.isArray(data.urls)) {
        const currentImages = Array.isArray(formData.images) ? formData.images : [];
        const newImages = data.urls.map((url, index) => ({
          url,
          is_primary: currentImages.length === 0 && index === 0, // First image is primary by default
          alt_text: '',
          friendly_name: '',
          order: currentImages.length + index
        }));
        
        setFormData(prev => ({
          ...prev,
          images: [...currentImages, ...newImages]
        }));
      } else {
        throw new Error('No URLs returned from upload');
      }
    } catch (err) {
      setUploadError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
      if (featuredImageInputRef.current) {
        featuredImageInputRef.current.value = '';
      }
    }
  };

  // Remove an image
  const handleRemoveImage = (index) => {
    const newImages = [...formData.images];
    const wasPromary = newImages[index].is_primary;
    newImages.splice(index, 1);
    
    // If removed image was primary and there are remaining images, make first one primary
    if (wasPromary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }
    
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  // Set an image as primary
  const handleSetPrimary = (index) => {
    const newImages = formData.images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  // Reorder images (move up/down)
  const handleReorderImage = (fromIndex, direction) => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= formData.images.length) return;
    
    const newImages = [...formData.images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    
    // Update order values
    newImages.forEach((img, i) => {
      img.order = i;
    });
    
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  // Update image metadata (alt_text, friendly_name)
  const handleImageFieldChange = (index, field, value) => {
    const newImages = [...formData.images];
    newImages[index] = {
      ...newImages[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      status: 'draft',
      page_type: 'article',
      section: '',
      images: [],
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
    setUploadError(null);
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
      section: Array.isArray(article.section) ? article.section : (article.section ? [article.section] : []),
      images: article.images || [],
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
      restricted_user_types: article.restricted_user_types || [],
      required_permissions: article.required_permissions || [],
      access_logic: article.access_logic || 'any_of'
    });
    setUploadError(null);
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
      {/* Header Actions */}
      <div className={"content-header-actions"}>
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

      {/* Article List View */}
      {activeView === 'list' && (
        <div className={"content-list-view"}>
          {/* Filters */}
          <div className={"content-filters"}>
            <div className={"filter-group"}>
              <label htmlFor="article-status-filter">Status:</label>
              <select 
                id="article-status-filter"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className={"form-select"}
              >
                <option value="all">All Articles</option>
                <option value="draft">Draft</option>
                <option value="ready_to_publish">Ready to Publish</option>
                <option value="published">Published</option>
              </select>
            </div>
            {propUserData?.user_type === 'admin' && (
              <div className={"filter-group"}>
                <label htmlFor="article-scope-filter">Scope:</label>
                <select 
                  id="article-scope-filter"
                  value={scopeFilter} 
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className={"form-select"}
                >
                  <option value="all">All articles (admin)</option>
                  <option value="mine">My articles only</option>
                </select>
              </div>
            )}
            <div className={"filter-group"}>
              <label htmlFor="article-search">Search:</label>
              <input
                type="text"
                id="article-search"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={"form-input"}
              />
            </div>
          </div>

          {/* Articles Table */}
          <div className={"content-articles-table"}>
            <table>
              <caption className="sr-only">Articles list</caption>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Status</th>
                  <th scope="col">Author</th>
                  <th scope="col">Created</th>
                  <th scope="col">Views</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map(article => (
                  <tr key={article.id}>
                    <td>
                      <div className={"content-article-title"}>
                        <strong>{article.title}</strong>
                        {article.excerpt && (
                          <p className={"content-excerpt"}>{article.excerpt}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${(article.status || 'draft').replace(' ', '_')}`}>
                        {(article.status || 'draft').replace('_', ' ')}
                      </span>
                    </td>
                    <td>{article.author_display_name || article.author_username || 'Unknown'}</td>
                    <td>{formatDate(article.created_at)}</td>
                    <td>{article.view_count || 0}</td>
                    <td>
                      <div className="content-action-buttons">
                        {article.status === 'published' && article.slug && (
                          <a 
                            href={`/articles/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={"secondary btn-sm"}
                            title="View published article"
                          >
                            View
                          </a>
                        )}
                        <button 
                          className={"secondary btn-sm"}
                          onClick={() => startEdit(article)}
                        >
                          Edit
                        </button>
                        <button 
                          className={"danger btn-sm"}
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
              <div className={"empty-state"}>
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
        <div className={"editor-view"}>
          <form onSubmit={activeView === 'create' ? handleCreate : handleUpdate}>
            {/* Basic Information */}
            <div className={"form-section"}>
              <h3>Article Information</h3>
              
              <div className={"form-group"}>
                <label htmlFor="article-title">Title *</label>
                <input
                  type="text"
                  id="article-title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className={"form-group"}>
                <label htmlFor="article-excerpt">Excerpt</label>
                <textarea
                  id="article-excerpt"
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  placeholder="Brief summary of the article..."
                  className={"form-textarea"}
                  rows="3"
                />
              </div>

              <div className={"form-row"}>
                <div className={"form-group"}>
                  <label htmlFor="article-status">Status</label>
                  <select
                    id="article-status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={"form-select"}
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

                <div className={"form-group"}>
                  <label htmlFor="article-page-type">Page Type</label>
                  <select
                    id="article-page-type"
                    name="page_type"
                    value={formData.page_type}
                    onChange={(e) => {
                      const newPageType = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        page_type: newPageType,
                        section: '' // Clear section when page type changes
                      }));
                    }}
                    className={"form-select"}
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

                {/* Section checkboxes - multi-select for article categorization */}
                {SECTION_OPTIONS[formData.page_type] && (
                  <div className={"form-group"}>
                    <label>Sections (select all that apply)</label>
                    <div className="section-checkboxes">
                      {SECTION_OPTIONS[formData.page_type].map(option => (
                        <label key={option.value}>
                          <input
                            type="checkbox"
                            checked={formData.section?.includes(option.value) || false}
                            onChange={(e) => {
                              const newSections = e.target.checked
                                ? [...(formData.section || []), option.value]
                                : (formData.section || []).filter(s => s !== option.value);
                              setFormData(prev => ({ ...prev, section: newSections }));
                            }}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Images Section */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Images</label>
                <p className="form-help-muted" style={{ marginBottom: '10px' }}>
                  Upload multiple images. The primary image will be used as the featured image.
                </p>
                
                <div className="content-image-grid">
                  {formData.images && formData.images.map((image, index) => (
                    <div
                      key={index}
                      className={`content-image-card ${image.is_primary ? 'is-primary' : ''}`}
                    >
                      {image.is_primary && <span className="primary-badge">PRIMARY</span>}
                      <img
                        src={image.url.startsWith('/') ? getApiUrl(image.url.slice(1)) : image.url}
                        alt={image.alt_text || `Image ${index + 1}`}
                        className="content-image-preview"
                      />
                      <div className="content-image-actions">
                        <button
                          type="button"
                          onClick={() => handleReorderImage(index, 'up')}
                          disabled={index === 0}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorderImage(index, 'down')}
                          disabled={index === formData.images.length - 1}
                          title="Move down"
                        >
                          ↓
                        </button>
                        {!image.is_primary && (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => handleSetPrimary(index)}
                            title="Set as primary"
                          >
                            ★
                          </button>
                        )}
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => handleRemoveImage(index)}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Alt text..."
                        value={image.alt_text || ''}
                        onChange={(e) => handleImageFieldChange(index, 'alt_text', e.target.value)}
                        className="content-image-alt-input"
                      />
                    </div>
                  ))}
                  <div
                    className={`content-upload-box ${uploadingImage ? 'uploading' : ''}`}
                    onClick={() => !uploadingImage && featuredImageInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <>
                        <i className="fas fa-spinner fa-spin upload-hint" style={{ fontSize: '24px' }}></i>
                        <span className="upload-hint">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus upload-hint" style={{ fontSize: '24px' }}></i>
                        <span className="upload-hint">Add Images</span>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  ref={featuredImageInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  multiple
                  style={{ display: 'none' }}
                />
                {uploadError && <span className="form-error-text">{uploadError}</span>}
              </div>

              <div className={"form-row"}>
                <div className={"form-group"}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="article-series">Series</label>
                    {permissions.can_manage_seo && (
                      <button
                        type="button"
                        onClick={() => setShowNewSeriesForm(!showNewSeriesForm)}
                        className={"secondary"}
                      >
                        + Add New Series
                      </button>
                    )}
                  </div>
                  
                  {showNewSeriesForm && (
                    <div className={"inline-form"} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        placeholder="Series name"
                        aria-label="New series name"
                        className="form-input"
                        style={{ flex: 1 }}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateSeries(e))}
                      />
                      <button 
                        type="button" 
                        onClick={handleCreateSeries}
                        className="primary" 
                        style={{ padding: '8px 16px' }}
                      >
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
                    </div>
                  )}

                  <select
                    id="article-series"
                    name="series_id"
                    value={formData.series_id}
                    onChange={handleInputChange}
                    className={"form-select"}
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
                <div className={"form-group"}>
                  <label htmlFor="article-position">Position in Series</label>
                  <input
                    type="number"
                    id="article-position"
                    name="position_in_series"
                    value={formData.position_in_series}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="1, 2, 3..."
                    min="1"
                  />
                  <small className={"form-help"}>
                    Order of this article within the series
                  </small>
                </div>
              )}

              {/* Topics - Show for assignment even without management permission */}
              <div className={"form-group"}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Topics (Categories)</label>
                  {permissions.can_manage_seo && (
                    <button
                      type="button"
                      onClick={() => setShowNewTopicForm(!showNewTopicForm)}
                      className={"secondary"}
                    >
                      + Add New Topic
                    </button>
                  )}
                </div>
                
                {showNewTopicForm && (
                  <div className={"inline-form"} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="Topic name"
                      className="form-input"
                      style={{ flex: 1 }}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTopic(e))}
                    />
                    <button 
                      type="button" 
                      onClick={handleCreateTopic}
                      className="primary" 
                      style={{ padding: '8px 16px' }}
                    >
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
                  </div>
                )}

                {topics.length > 0 ? (
                  <div className={"topic-checkboxes"}>
                    {topics.map(topic => (
                      <label key={topic.id} className="checkbox-label">
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
                  <div className={"empty-state"}>
                    <p>No topics available. Topics are used to categorize articles.</p>
                    {permissions.can_manage_seo && (
                      <p><small>Use the "Add New Topic" button above to create your first topic.</small></p>
                    )}
                  </div>
                )}
                <small className={"form-help"}>
                  Select categories that best describe this article
                </small>
              </div>

              {/* Tags */}
              <div className={"form-group"}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Tags</label>
                  {permissions.can_manage_seo && (
                    <button
                      type="button"
                      onClick={() => setShowNewTagForm(!showNewTagForm)}
                      className={"secondary"}
                    >
                      + Add New Tag
                    </button>
                  )}
                </div>
                
                {showNewTagForm && (
                  <div className={"inline-form"} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name"
                      aria-label="New tag name"
                      className="form-input"
                      style={{ flex: 1 }}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTag(e))}
                    />
                    <button 
                      type="button" 
                      onClick={handleCreateTag}
                      className="primary" 
                      style={{ padding: '8px 16px' }}
                    >
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
                  </div>
                )}

                {tags.length > 0 ? (
                  <div className={"topic-checkboxes"}>
                    {tags.map(tag => (
                      <label key={tag.id} className="checkbox-label">
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
                  <div className={"empty-state"}>
                    <p>No tags available yet. Tags help users find related articles.</p>
                    {permissions.can_manage_seo && (
                      <p><small>Use the "Add New Tag" button above to create your first tag.</small></p>
                    )}
                  </div>
                )}
                <small className={"form-help"}>
                  Select relevant tags for this article
                </small>
              </div>
            </div>

            {/* Content Editor */}
            <div className={"form-section"}>
              <h3>Content</h3>
              <BlockEditor
                value={formData.content}
                onChange={handleContentChange}
                minHeight={500}
                placeholder="Start writing your article..."
                imageUploadEndpoint={typeof getApiUrl === 'function' ? getApiUrl('api/v2/content/articles/upload') : '/api/v2/content/articles/upload'}
              />
            </div>

            {/* Access Control Section */}
            <div className={"form-section"}>
              <h3>Access Control</h3>
              <p className={"section-description"}>
                Control who can view this article. Leave empty for public access.
              </p>

              <div className={"form-group"}>
                <label>Restrict to User Types</label>
                <div className={"checkbox-grid"}>
                  {['artist', 'promoter', 'community', 'admin'].map(userType => (
                    <label key={userType} className="checkbox-label">
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

              <div className={"form-group"}>
                <label>Require Permissions</label>
                <div className={"checkbox-grid"}>
                  {['vendor', 'manage_sites', 'manage_content', 'manage_system'].map(permission => (
                    <label key={permission} className="checkbox-label">
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
                <div className={"form-group"}>
                  <label htmlFor="article-access-logic">Access Logic</label>
                  <select
                    id="article-access-logic"
                    name="access_logic"
                    value={formData.access_logic}
                    onChange={handleInputChange}
                    className={"form-select"}
                  >
                    <option value="any_of">User needs ANY of the selected criteria</option>
                    <option value="must_meet_all">User must meet ALL selected criteria</option>
                  </select>
                </div>
              )}
            </div>

            {/* SEO Section */}
            {permissions.can_manage_seo && (
              <div className={"form-section"}>
                <div className={"seo-header"}>
                  <h3>SEO Settings</h3>
                  <button 
                    type="button"
                    className="secondary"
                    onClick={generateSEOFields}
                  >
                    Auto-Generate SEO
                  </button>
                </div>

                <div className={"form-group"}>
                  <label>Meta Title</label>
                  <input
                    type="text"
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className={"form-group"}>
                  <label>Meta Description</label>
                  <textarea
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleInputChange}
                    className={"form-textarea"}
                    rows="3"
                  />
                </div>

                <div className={"form-group"}>
                  <label>Meta Keywords</label>
                  <input
                    type="text"
                    name="meta_keywords"
                    value={formData.meta_keywords}
                    onChange={handleInputChange}
                    placeholder="keyword1, keyword2, keyword3"
                    className="form-input"
                  />
                </div>


              </div>
            )}

            {/* Open Graph Social Share Section */}
            <div className={"form-section"}>
              <h3>Open Graph Social Share</h3>
              <p className={"section-description"}>
                Control how your article appears when shared on social media platforms like Facebook, LinkedIn, Discord, and more.
              </p>

              <div className={"form-group"}>
                <label>Social Share Title</label>
                <input
                  type="text"
                  name="og_title"
                  value={formData.og_title}
                  onChange={handleInputChange}
                  placeholder="Leave empty to use article title"
                  className="form-input"
                />
              </div>

              <div className={"form-group"}>
                <label>Social Share Description</label>
                <textarea
                  name="og_description"
                  value={formData.og_description}
                  onChange={handleInputChange}
                  placeholder="Leave empty to use article excerpt"
                  className={"form-textarea"}
                  rows="3"
                />
              </div>

              <div className={"form-group"}>
                <label>Social Share Image</label>
                <input
                  type="url"
                  name="og_image"
                  value={formData.og_image}
                  onChange={handleInputChange}
                  placeholder="https://yoursite.com/share-image.jpg"
                  className="form-input"
                />
                <small className={"form-help"}>
                  Recommended: 1200x630px. Used by Facebook, LinkedIn, Discord, and other platforms.
                </small>
              </div>

              {/* Twitter-specific overrides */}
              <div className={"form-group"}>
                <label>Twitter/X Specific Overrides</label>
                <div className={"twitter-fields"}>
                  <input
                    type="text"
                    name="twitter_title"
                    value={formData.twitter_title}
                    onChange={handleInputChange}
                    placeholder="Twitter title (optional override)"
                    className="form-input"
                  />
                  <textarea
                    name="twitter_description"
                    value={formData.twitter_description}
                    onChange={handleInputChange}
                    placeholder="Twitter description (optional override)"
                    className={"form-textarea"}
                    rows="2"
                  />
                  <input
                    type="url"
                    name="twitter_image"
                    value={formData.twitter_image}
                    onChange={handleInputChange}
                    placeholder="Twitter image URL (optional override)"
                    className="form-input"
                  />
                </div>
                <small className={"form-help"}>
                  Optional: Override the above fields specifically for Twitter/X. Leave empty to use the main social share settings.
                </small>
              </div>
            </div>

            {/* Form Actions */}
            <div className={"form-actions"}>
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
} 