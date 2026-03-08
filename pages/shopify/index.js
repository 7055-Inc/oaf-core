/**
 * Shopify Embedded App Page
 * Loaded inside Shopify admin iframe when a merchant opens the Brakebee app.
 *
 * Auth flow:
 *  1. Try Shopify session token (auto-auth for connected stores)
 *  2. Fall back to existing Brakebee JWT in storage (logged in but store not yet connected)
 *  3. If neither, show inline login form
 *  4. After login, page reloads → step 2 catches the JWT → shows connector dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { Redirect } from '@shopify/app-bridge/actions';
import { storeTokens, getAuthToken } from '../../lib/auth';
import { getCurrentUser } from '../../lib/users/api';
import { isAdmin } from '../../lib/userUtils';
import ShopifyEmbeddedShell from '../../modules/catalog/components/shopify/ShopifyEmbeddedShell';
import ShopifyConnector from '../../modules/catalog/components/addons/ShopifyConnector';
import ConnectorSubscriptionGate from '../../modules/catalog/components/ConnectorSubscriptionGate';
import { SHOPIFY_CONNECTOR_OPTS } from '../../modules/catalog/components/connectorSubscriptionConfig';
import { LoginModal } from '../../modules/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://brakebee.com';

export default function ShopifyEmbeddedAppPage() {
  const [state, setState] = useState('loading');
  const [userData, setUserData] = useState(null);
  const [shopDomain, setShopDomain] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [appBridge, setAppBridge] = useState(null);

  const init = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host');
    const shop = params.get('shop');
    if (shop) setShopDomain(shop);

    // Preserve host/shop params so LoginModal redirect comes back here with them
    if (host && !params.get('redirect')) {
      const redirectUrl = `/shopify?host=${encodeURIComponent(host)}${shop ? `&shop=${encodeURIComponent(shop)}` : ''}`;
      params.set('redirect', redirectUrl);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }

    // Step 1: Try App Bridge session token (works when store is already connected)
    if (host) {
      try {
        const configRes = await fetch(`${API_BASE}/api/v2/catalog/shopify/app/config`);
        const configData = await configRes.json();

        if (configData.success && configData.data?.apiKey) {
          const app = createApp({ apiKey: configData.data.apiKey, host });
          setAppBridge(app);

          const sessionToken = await getSessionToken(app);
          const authRes = await fetch(`${API_BASE}/api/v2/catalog/shopify/auth/session-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
          });
          const authData = await authRes.json();

          if (authData.success && authData.data?.accessToken) {
            storeTokens(authData.data.accessToken, '');
            setShopDomain(authData.data.shopDomain || shop || '');
            const user = await getCurrentUser();
            setUserData(user);
            setState('authenticated');
            return;
          }
        }
      } catch (err) {
        console.error('Session token auth failed, trying JWT fallback:', err.message);
      }
    }

    // Step 2: Check for existing Brakebee JWT (user logged in but store may not be connected yet)
    const existingToken = getAuthToken();
    if (existingToken) {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserData(user);
          setState('authenticated');
          return;
        }
      } catch (_) { /* token invalid/expired, fall through to login */ }
    }

    // Step 3: No valid auth -- show login form
    setState('needs_login');
  }, []);

  useEffect(() => { init(); }, [init]);

  function handleOpenDashboard() {
    if (appBridge) {
      const redirect = Redirect.create(appBridge);
      redirect.dispatch(Redirect.Action.REMOTE, {
        url: `${FRONTEND_URL}/dashboard/catalog/addons/shopify`,
        newContext: true
      });
    } else {
      window.open(`${FRONTEND_URL}/dashboard/catalog/addons/shopify`, '_blank');
    }
  }

  // ─── Loading ─────────────────────────────────

  if (state === 'loading') {
    return (
      <>
        <Head><title>Brakebee | Shopify App</title></Head>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #e0e0e0', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#666', fontSize: '14px' }}>Connecting to Brakebee...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </>
    );
  }

  // ─── Login Form ──────────────────────────────

  if (state === 'needs_login') {
    return (
      <>
        <Head><title>Brakebee | Sign In</title></Head>
        <ShopifyEmbeddedShell shopDomain={shopDomain} onOpenDashboard={handleOpenDashboard}>
          <div style={{ maxWidth: '440px', margin: '20px auto' }}>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Sign in to your Brakebee account to manage your Shopify connector.
            </p>
            <LoginModal />
          </div>
        </ShopifyEmbeddedShell>
      </>
    );
  }

  // ─── Authenticated ───────────────────────────

  if (!userData) return null;

  return (
    <>
      <Head><title>Brakebee | Shopify Connector</title></Head>
      <ShopifyEmbeddedShell shopDomain={shopDomain} onOpenDashboard={handleOpenDashboard}>
        {isAdmin(userData) ? (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '700' }}>Shopify Connector</h1>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Connect your Shopify store and sync product listings</p>
            </div>
            <ShopifyConnector userData={userData} appBridge={appBridge} />
          </>
        ) : (
          <ConnectorSubscriptionGate
            addonSlug="shopify-connector"
            userData={userData}
            connectorOpts={SHOPIFY_CONNECTOR_OPTS}
          >
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '700' }}>Shopify Connector</h1>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Connect your Shopify store and sync product listings</p>
            </div>
            <ShopifyConnector userData={userData} appBridge={appBridge} />
          </ConnectorSubscriptionGate>
        )}
      </ShopifyEmbeddedShell>
    </>
  );
}
