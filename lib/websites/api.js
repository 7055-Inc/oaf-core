/**
 * Websites / Sites API client
 * v2 API at api/v2/websites. Use from dashboard websites module.
 * 
 * Complete replacement for legacy:
 * - api/sites
 * - api/domains
 * - api/subscriptions/websites
 */

import { authApiRequest } from '../apiUtils';
import { authenticatedApiRequest } from '../csrf';

const BASE = 'api/v2/websites';

// ============================================================================
// SITES
// ============================================================================

export async function fetchMySites() {
  const response = await authApiRequest(`${BASE}/sites/me`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch sites');
  return Array.isArray(data) ? data : [];
}

export async function fetchAllSites() {
  const response = await authApiRequest(`${BASE}/sites/all`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch all sites');
  return Array.isArray(data) ? data : [];
}

export async function createSite(body) {
  const response = await authApiRequest(`${BASE}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to create site');
  return data;
}

export async function updateSite(siteId, body) {
  const response = await authApiRequest(`${BASE}/sites/${siteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to update site');
  return data;
}

export async function deleteSite(siteId) {
  const response = await authApiRequest(`${BASE}/sites/${siteId}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Failed to delete site');
  return data;
}

export async function fetchSiteCustomizations(siteId) {
  const response = await authApiRequest(`${BASE}/sites/${siteId}/customizations`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch customizations');
  return data.customizations ?? data;
}

export async function updateSiteCustomizations(siteId, customizations) {
  const response = await authApiRequest(`${BASE}/sites/${siteId}/customizations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customizations)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save customizations');
  return data;
}

export async function enforceSiteLimits() {
  const response = await authApiRequest(`${BASE}/enforce-limits`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to enforce limits');
  return data;
}

// ============================================================================
// TEMPLATES
// ============================================================================

export async function fetchTemplates() {
  const response = await authApiRequest(`${BASE}/templates`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch templates');
  return data.templates || [];
}

export async function fetchTemplate(templateId) {
  const response = await authApiRequest(`${BASE}/templates/${templateId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch template');
  return data.template || data;
}

export async function applyTemplate(templateId) {
  const response = await authApiRequest(`${BASE}/template/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to apply template');
  return data;
}

export async function createTemplate(body) {
  const response = await authApiRequest(`${BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create template');
  return data;
}

// ============================================================================
// ADDONS
// ============================================================================

export async function fetchAddons() {
  const response = await authApiRequest(`${BASE}/addons`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch addons');
  return data.addons || [];
}

export async function fetchMySiteAddons() {
  const response = await authApiRequest(`${BASE}/my-addons`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch my addons');
  return data.addons || [];
}

export async function enableSiteAddon(siteId, addonId) {
  const response = await authApiRequest(`${BASE}/sites/${siteId}/addons/${addonId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addon_id: addonId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to enable addon');
  return data;
}

export async function disableSiteAddon(siteId, addonId) {
  const response = await authApiRequest(`${BASE}/sites/${siteId}/addons/${addonId}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to disable addon');
  return data;
}

export async function enableUserAddon(addonId) {
  const response = await authApiRequest(`${BASE}/user-addons/${addonId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addon_id: addonId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to enable addon');
  return data;
}

export async function disableUserAddon(addonId) {
  const response = await authApiRequest(`${BASE}/user-addons/${addonId}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to disable addon');
  return data;
}

export async function createAddon(body) {
  const response = await authApiRequest(`${BASE}/addons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create addon');
  return data;
}

// ============================================================================
// USER CATEGORIES
// ============================================================================

export async function fetchUserCategories() {
  const response = await authApiRequest(`${BASE}/categories`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch categories');
  return Array.isArray(data) ? data : [];
}

export async function createUserCategory(body) {
  const response = await authApiRequest(`${BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create category');
  return data;
}

export async function updateUserCategory(categoryId, body) {
  const response = await authApiRequest(`${BASE}/categories/${categoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update category');
  return data;
}

export async function deleteUserCategory(categoryId) {
  const response = await authApiRequest(`${BASE}/categories/${categoryId}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete category');
  return data;
}

// ============================================================================
// DISCOUNTS
// ============================================================================

export async function calculateDiscounts(subscriptionType) {
  const response = await authApiRequest(`${BASE}/discounts/calculate?subscription_type=${encodeURIComponent(subscriptionType)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to calculate discounts');
  return data;
}

export async function createDiscount(body) {
  const response = await authApiRequest(`${BASE}/discounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create discount');
  return data;
}

export async function deleteDiscount(discountId) {
  const response = await authApiRequest(`${BASE}/discounts/${discountId}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete discount');
  return data;
}

// ============================================================================
// DOMAINS (custom domain management)
// ============================================================================

export async function fetchDomainStatus(siteId) {
  const response = await authApiRequest(`${BASE}/domains/status/${siteId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch domain status');
  return data;
}

export async function checkDomainAvailability(domain) {
  const response = await authenticatedApiRequest(
    `${BASE}/domains/check-availability?domain=${encodeURIComponent(domain)}`
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to check domain');
  return data;
}

export async function startDomainValidation(siteId, customDomain) {
  const response = await authenticatedApiRequest(`${BASE}/domains/start-validation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, customDomain })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to start domain validation');
  return data;
}

export async function retryDomainValidation(siteId) {
  const response = await authenticatedApiRequest(`${BASE}/domains/retry-validation/${siteId}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to retry validation');
  return data;
}

export async function cancelDomainValidation(siteId) {
  const response = await authenticatedApiRequest(`${BASE}/domains/cancel-validation/${siteId}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to cancel validation');
  return data;
}

export async function removeCustomDomain(siteId) {
  const response = await authenticatedApiRequest(`${BASE}/domains/remove/${siteId}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to remove domain');
  return data;
}

export async function fetchAllDomains() {
  const response = await authApiRequest(`${BASE}/domains/list`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch domains');
  return Array.isArray(data) ? data : [];
}

// ============================================================================
// SUBSCRIPTION (websites tier/terms/card)
// ============================================================================

export async function fetchWebsitesSubscription() {
  const response = await authApiRequest(`${BASE}/subscription/my`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch subscription');
  return data;
}

export async function fetchWebsitesSubscriptionStatus() {
  const response = await authApiRequest(`${BASE}/subscription/status`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch subscription status');
  return data;
}

export async function selectWebsitesTier(body) {
  const response = await authenticatedApiRequest(`${BASE}/subscription/select-tier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to select tier');
  return data;
}

export async function fetchWebsitesTermsCheck() {
  const response = await authApiRequest(`${BASE}/subscription/terms-check`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to check terms');
  return data;
}

export async function acceptWebsitesTerms(termsVersionId) {
  const response = await authenticatedApiRequest(`${BASE}/subscription/terms-accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terms_version_id: termsVersionId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to accept terms');
  return data;
}

export async function changeWebsitesTier(body) {
  const response = await authenticatedApiRequest(`${BASE}/subscription/change-tier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to change tier');
  return data;
}

export async function cancelWebsitesSubscription() {
  const response = await authApiRequest(`${BASE}/subscription/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to cancel subscription');
  return data;
}

// ============================================================================
// PUBLIC RESOLVE (for storefronts - these can be called without auth)
// ============================================================================

export async function resolveSubdomain(subdomain) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${BASE}/resolve/${subdomain}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Site not found');
  return data;
}

export async function resolveSubdomainProducts(subdomain, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${BASE}/resolve/${subdomain}/products${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch products');
  return data;
}

export async function resolveSubdomainArticles(subdomain, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${BASE}/resolve/${subdomain}/articles${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch articles');
  return data;
}

export async function resolveSubdomainCategories(subdomain) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${BASE}/resolve/${subdomain}/categories`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch categories');
  return data;
}

export async function checkSubdomainAvailability(subdomain) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${BASE}/check-subdomain/${subdomain}`);
  const data = await response.json();
  return data;
}

export async function resolveCustomDomain(domain) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${BASE}/resolve-custom-domain/${domain}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Custom domain not found');
  return data;
}

export async function fetchSiteAddonsPublic(siteId) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${BASE}/sites/${siteId}/addons`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch site addons');
  return data.addons || [];
}
