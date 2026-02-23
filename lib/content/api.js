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

function unwrap(json) {
  if (json.success && json.data !== undefined) return json.data;
  return json;
}

function extractError(json, fallback) {
  if (json.error?.message) return json.error.message;
  if (typeof json.error === 'string') return json.error;
  return fallback;
}

export async function fetchArticles(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const response = await authenticatedApiRequest(url('', qs), { method: 'GET' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to fetch articles'));
  return unwrap(json);
}

export async function fetchArticleById(id) {
  const response = await authenticatedApiRequest(url(`by-id/${id}`), { method: 'GET' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to fetch article'));
  return unwrap(json);
}

export async function fetchArticleBySlug(slug) {
  const response = await authenticatedApiRequest(url(slug), { method: 'GET' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to fetch article'));
  return unwrap(json);
}

export async function createArticle(body) {
  const response = await authenticatedApiRequest(url(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to create article'));
  return unwrap(json);
}

export async function updateArticle(id, body) {
  const response = await authenticatedApiRequest(url(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to update article'));
  return unwrap(json);
}

export async function deleteArticle(id) {
  const response = await authenticatedApiRequest(url(id), { method: 'DELETE' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to delete article'));
  return unwrap(json);
}

export async function fetchTopics() {
  const response = await authenticatedApiRequest(url('topics'), { method: 'GET' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to fetch topics'));
  return unwrap(json);
}

export async function createTopic(body) {
  const response = await authenticatedApiRequest(url('topics'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to create topic'));
  return unwrap(json);
}

export async function updateTopic(id, body) {
  const response = await authenticatedApiRequest(url(`topics/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to update topic'));
  return unwrap(json);
}

export async function deleteTopic(id) {
  const response = await authenticatedApiRequest(url(`topics/${id}`), { method: 'DELETE' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to delete topic'));
  return unwrap(json);
}

export async function fetchTags() {
  const response = await authenticatedApiRequest(url('tags'), { method: 'GET' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to fetch tags'));
  const data = unwrap(json);
  return Array.isArray(data) ? data : (data.tags || data);
}

export async function createTag(body) {
  const response = await authenticatedApiRequest(url('tags'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to create tag'));
  return unwrap(json);
}

export async function updateTag(id, body) {
  const response = await authenticatedApiRequest(url(`tags/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to update tag'));
  return unwrap(json);
}

export async function deleteTag(id) {
  const response = await authenticatedApiRequest(url(`tags/${id}`), { method: 'DELETE' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to delete tag'));
  return unwrap(json);
}

export async function fetchSeries() {
  const response = await authenticatedApiRequest(url('series'), { method: 'GET' });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to fetch series'));
  return unwrap(json);
}

export async function createSeries(body) {
  const response = await authenticatedApiRequest(url('series'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to create series'));
  return unwrap(json);
}

export async function uploadArticleImages(articleId, formData) {
  const response = await authenticatedApiRequest(url(`upload?article_id=${articleId}`), {
    method: 'POST',
    body: formData,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(extractError(json, 'Failed to upload images'));
  return unwrap(json);
}
