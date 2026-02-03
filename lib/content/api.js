/**
 * Content API Client (v2)
 * Articles, topics, tags, series - all calls use /api/v2/content/articles/*
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const CONTENT_BASE = 'api/v2/content/articles';

function url(path = '', query = '') {
  const p = path ? `/${path.replace(/^\//, '')}` : '';
  const q = query ? `?${query.replace(/^\?/, '')}` : '';
  return getApiUrl(`${CONTENT_BASE}${p}${q}`);
}

export async function fetchArticles(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const response = await authenticatedApiRequest(url('', qs), { method: 'GET' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch articles');
  return data;
}

export async function fetchArticleById(id) {
  const response = await authenticatedApiRequest(url(`by-id/${id}`), { method: 'GET' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch article');
  return data;
}

export async function fetchArticleBySlug(slug) {
  const response = await authenticatedApiRequest(url(slug), { method: 'GET' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch article');
  return data;
}

export async function createArticle(body) {
  const response = await authenticatedApiRequest(url(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create article');
  return data;
}

export async function updateArticle(id, body) {
  const response = await authenticatedApiRequest(url(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update article');
  return data;
}

export async function deleteArticle(id) {
  const response = await authenticatedApiRequest(url(id), { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete article');
  return data;
}

export async function fetchTopics() {
  const response = await authenticatedApiRequest(url('topics'), { method: 'GET' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch topics');
  return data;
}

export async function createTopic(body) {
  const response = await authenticatedApiRequest(url('topics'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create topic');
  return data;
}

export async function updateTopic(id, body) {
  const response = await authenticatedApiRequest(url(`topics/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update topic');
  return data;
}

export async function deleteTopic(id) {
  const response = await authenticatedApiRequest(url(`topics/${id}`), { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete topic');
  return data;
}

export async function fetchTags() {
  const response = await authenticatedApiRequest(url('tags'), { method: 'GET' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch tags');
  return Array.isArray(data) ? data : (data.tags || data);
}

export async function createTag(body) {
  const response = await authenticatedApiRequest(url('tags'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create tag');
  return data;
}

export async function updateTag(id, body) {
  const response = await authenticatedApiRequest(url(`tags/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update tag');
  return data;
}

export async function deleteTag(id) {
  const response = await authenticatedApiRequest(url(`tags/${id}`), { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete tag');
  return data;
}

export async function fetchSeries() {
  const response = await authenticatedApiRequest(url('series'), { method: 'GET' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch series');
  return data;
}

export async function createSeries(body) {
  const response = await authenticatedApiRequest(url('series'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create series');
  return data;
}

export async function uploadArticleImages(articleId, formData) {
  const response = await authenticatedApiRequest(url(`upload?article_id=${articleId}`), {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to upload images');
  return data;
}
