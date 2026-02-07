/**
 * OAuth Service
 * 
 * Handles OAuth flows for social media platforms
 * - Meta (Facebook/Instagram)
 * - Twitter/X
 * - TikTok
 * - Pinterest
 */

const db = require('../../../../config/db');
const axios = require('axios');

class OAuthService {
  /**
   * Generate OAuth authorization URL for a platform
   * @param {string} platform - Platform name (facebook, instagram, twitter, tiktok, pinterest)
   * @param {string} redirectUri - Callback URL
   * @param {string} state - CSRF protection state
   * @returns {object} - { success, authUrl }
   */
  static async generateAuthUrl(platform, redirectUri, state) {
    try {
      let authUrl;
      let scope;

      switch (platform.toLowerCase()) {
        case 'facebook':
        case 'instagram':
        case 'meta':
          // Meta uses same OAuth for both FB and IG
          scope = 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish';
          authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
            `client_id=${process.env.META_APP_ID}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}&` +
            `scope=${scope}`;
          break;

        case 'twitter':
        case 'x':
          // Twitter OAuth 2.0
          scope = 'tweet.read tweet.write users.read offline.access';
          authUrl = `https://twitter.com/i/oauth2/authorize?` +
            `response_type=code&` +
            `client_id=${process.env.TWITTER_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `state=${state}&` +
            `code_challenge=challenge&` +
            `code_challenge_method=plain`;
          break;

        case 'tiktok':
          // TikTok Content Posting API
          scope = 'user.info.basic,video.publish';
          authUrl = `https://www.tiktok.com/v2/auth/authorize?` +
            `client_key=${process.env.TIKTOK_CLIENT_KEY}&` +
            `scope=${scope}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}`;
          break;

        case 'pinterest':
          // Pinterest API v5
          scope = 'boards:read,pins:read,pins:write';
          authUrl = `https://www.pinterest.com/oauth/?` +
            `client_id=${process.env.PINTEREST_APP_ID}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${scope}&` +
            `state=${state}`;
          break;

        default:
          return {
            success: false,
            error: `Unsupported platform: ${platform}`
          };
      }

      return {
        success: true,
        authUrl,
        platform,
        state
      };
    } catch (error) {
      console.error('Generate auth URL error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   * @param {string} platform - Platform name
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Callback URL
   * @param {object} ownerInfo - { owner_type, owner_id }
   * @returns {object} - { success, connection }
   */
  static async handleCallback(platform, code, redirectUri, ownerInfo) {
    try {
      let tokenData;

      switch (platform.toLowerCase()) {
        case 'facebook':
        case 'instagram':
        case 'meta':
          tokenData = await this._exchangeMetaToken(code, redirectUri);
          break;

        case 'twitter':
        case 'x':
          tokenData = await this._exchangeTwitterToken(code, redirectUri);
          break;

        case 'tiktok':
          tokenData = await this._exchangeTikTokToken(code, redirectUri);
          break;

        case 'pinterest':
          tokenData = await this._exchangePinterestToken(code, redirectUri);
          break;

        default:
          return {
            success: false,
            error: `Unsupported platform: ${platform}`
          };
      }

      if (!tokenData.success) {
        return tokenData;
      }

      // Store tokens in database
      const connection = await this.storeConnection({
        platform: this._normalizePlatform(platform),
        ...tokenData.data,
        ...ownerInfo
      });

      return connection;
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Exchange Meta authorization code for access token
   */
  static async _exchangeMetaToken(code, redirectUri) {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: redirectUri,
          code: code
        }
      });

      const { access_token } = response.data;

      // Get long-lived token
      const longLivedResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: access_token
        }
      });

      const { access_token: longLivedToken, expires_in } = longLivedResponse.data;

      // Get user/page info
      const meResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          access_token: longLivedToken,
          fields: 'id,name'
        }
      });

      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        data: {
          account_id: meResponse.data.id,
          account_name: meResponse.data.name,
          access_token: longLivedToken,
          refresh_token: null, // Meta uses long-lived tokens
          token_expires_at: expiresAt,
          permissions: { scopes: ['pages_manage_posts', 'instagram_content_publish'] }
        }
      };
    } catch (error) {
      console.error('Meta token exchange error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Exchange Twitter authorization code for access token
   */
  static async _exchangeTwitterToken(code, redirectUri) {
    try {
      const credentials = Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64');

      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge'
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Get user info
      const meResponse = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        data: {
          account_id: meResponse.data.data.id,
          account_name: meResponse.data.data.username,
          access_token,
          refresh_token,
          token_expires_at: expiresAt,
          permissions: { scopes: ['tweet.read', 'tweet.write'] }
        }
      };
    } catch (error) {
      console.error('Twitter token exchange error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Exchange TikTok authorization code for access token
   */
  static async _exchangeTikTokToken(code, redirectUri) {
    try {
      const response = await axios.post(
        'https://open-api.tiktok.com/oauth/access_token/',
        {
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        }
      );

      const { access_token, refresh_token, expires_in, open_id } = response.data.data;

      // Get user info
      const userResponse = await axios.post(
        'https://open-api.tiktok.com/user/info/',
        {
          access_token: access_token,
          open_id: open_id
        }
      );

      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        data: {
          account_id: open_id,
          account_name: userResponse.data.data?.user?.display_name || open_id,
          access_token,
          refresh_token,
          token_expires_at: expiresAt,
          permissions: { scopes: ['user.info.basic', 'video.publish'] }
        }
      };
    } catch (error) {
      console.error('TikTok token exchange error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Exchange Pinterest authorization code for access token
   */
  static async _exchangePinterestToken(code, redirectUri) {
    try {
      const credentials = Buffer.from(
        `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
      ).toString('base64');

      const response = await axios.post(
        'https://api.pinterest.com/v5/oauth/token',
        new URLSearchParams({
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Get user info
      const meResponse = await axios.get('https://api.pinterest.com/v5/user_account', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        data: {
          account_id: meResponse.data.username,
          account_name: meResponse.data.username,
          access_token,
          refresh_token,
          token_expires_at: expiresAt,
          permissions: { scopes: ['pins:write'] }
        }
      };
    } catch (error) {
      console.error('Pinterest token exchange error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Refresh access token
   * @param {number} connectionId - Connection ID
   * @returns {object} - { success, connection }
   */
  static async refreshToken(connectionId) {
    try {
      // Get connection
      const [connections] = await db.execute(
        'SELECT * FROM social_connections WHERE id = ?',
        [connectionId]
      );

      if (connections.length === 0) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      const connection = connections[0];

      if (!connection.refresh_token) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      let tokenData;

      switch (connection.platform) {
        case 'twitter':
          tokenData = await this._refreshTwitterToken(connection.refresh_token);
          break;

        case 'tiktok':
          tokenData = await this._refreshTikTokToken(connection.refresh_token);
          break;

        case 'pinterest':
          tokenData = await this._refreshPinterestToken(connection.refresh_token);
          break;

        case 'facebook':
        case 'instagram':
          // Meta tokens are long-lived and don't refresh via refresh_token
          return {
            success: false,
            error: 'Meta tokens use long-lived tokens, not refresh tokens'
          };

        default:
          return {
            success: false,
            error: `Token refresh not supported for ${connection.platform}`
          };
      }

      if (!tokenData.success) {
        return tokenData;
      }

      // Update connection with new tokens
      await db.execute(
        `UPDATE social_connections 
         SET access_token = ?, 
             refresh_token = ?, 
             token_expires_at = ?,
             status = 'active',
             updated_at = NOW()
         WHERE id = ?`,
        [
          tokenData.data.access_token,
          tokenData.data.refresh_token || connection.refresh_token,
          tokenData.data.token_expires_at,
          connectionId
        ]
      );

      return {
        success: true,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh Twitter token
   */
  static async _refreshTwitterToken(refreshToken) {
    try {
      const credentials = Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString('base64');

      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        data: {
          access_token,
          refresh_token,
          token_expires_at: expiresAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Refresh TikTok token
   */
  static async _refreshTikTokToken(refreshToken) {
    try {
      const response = await axios.post(
        'https://open-api.tiktok.com/oauth/refresh_token/',
        {
          client_key: process.env.TIKTOK_CLIENT_KEY,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }
      );

      const { access_token, refresh_token, expires_in } = response.data.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        data: {
          access_token,
          refresh_token,
          token_expires_at: expiresAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Refresh Pinterest token
   */
  static async _refreshPinterestToken(refreshToken) {
    try {
      const credentials = Buffer.from(
        `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`
      ).toString('base64');

      const response = await axios.post(
        'https://api.pinterest.com/v5/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        success: true,
        data: {
          access_token,
          refresh_token,
          token_expires_at: expiresAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Store connection in database
   */
  static async storeConnection(data) {
    try {
      const {
        owner_type,
        owner_id,
        platform,
        account_id,
        account_name,
        access_token,
        refresh_token,
        token_expires_at,
        permissions
      } = data;

      // Check if connection already exists
      const [existing] = await db.execute(
        `SELECT id FROM social_connections 
         WHERE owner_type = ? AND owner_id = ? AND platform = ? AND account_id = ?`,
        [owner_type, owner_id, platform, account_id]
      );

      if (existing.length > 0) {
        // Update existing connection
        await db.execute(
          `UPDATE social_connections 
           SET account_name = ?,
               access_token = ?,
               refresh_token = ?,
               token_expires_at = ?,
               permissions = ?,
               status = 'active',
               updated_at = NOW()
           WHERE id = ?`,
          [
            account_name,
            access_token,
            refresh_token,
            token_expires_at,
            JSON.stringify(permissions),
            existing[0].id
          ]
        );

        return {
          success: true,
          connection: {
            id: existing[0].id,
            platform,
            account_id,
            account_name,
            status: 'active'
          }
        };
      } else {
        // Insert new connection
        const [result] = await db.execute(
          `INSERT INTO social_connections 
           (owner_type, owner_id, platform, account_id, account_name, 
            access_token, refresh_token, token_expires_at, permissions, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            owner_type,
            owner_id,
            platform,
            account_id,
            account_name,
            access_token,
            refresh_token,
            token_expires_at,
            JSON.stringify(permissions)
          ]
        );

        return {
          success: true,
          connection: {
            id: result.insertId,
            platform,
            account_id,
            account_name,
            status: 'active'
          }
        };
      }
    } catch (error) {
      console.error('Store connection error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get connection by ID
   */
  static async getConnection(connectionId) {
    try {
      const [connections] = await db.execute(
        'SELECT * FROM social_connections WHERE id = ?',
        [connectionId]
      );

      if (connections.length === 0) {
        return {
          success: false,
          error: 'Connection not found'
        };
      }

      const connection = connections[0];

      // Parse JSON fields
      if (connection.permissions) {
        connection.permissions = JSON.parse(connection.permissions);
      }

      return {
        success: true,
        connection
      };
    } catch (error) {
      console.error('Get connection error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all connections for owner
   */
  static async getConnections(ownerType, ownerId) {
    try {
      const [connections] = await db.execute(
        `SELECT id, platform, account_id, account_name, status, 
                token_expires_at, created_at, updated_at
         FROM social_connections 
         WHERE owner_type = ? AND owner_id = ?
         ORDER BY platform, created_at DESC`,
        [ownerType, ownerId]
      );

      return {
        success: true,
        connections
      };
    } catch (error) {
      console.error('Get connections error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete connection
   */
  static async deleteConnection(connectionId, ownerType, ownerId) {
    try {
      const [result] = await db.execute(
        `DELETE FROM social_connections 
         WHERE id = ? AND owner_type = ? AND owner_id = ?`,
        [connectionId, ownerType, ownerId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          error: 'Connection not found or access denied'
        };
      }

      return {
        success: true,
        message: 'Connection deleted successfully'
      };
    } catch (error) {
      console.error('Delete connection error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Normalize platform name
   */
  static _normalizePlatform(platform) {
    const normalized = platform.toLowerCase();
    if (normalized === 'x') return 'twitter';
    if (normalized === 'meta') return 'facebook';
    return normalized;
  }
}

module.exports = OAuthService;
