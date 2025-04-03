const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

class AuthConfig {
  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = '24h';
  }

  async verifyGoogleToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      return ticket.getPayload();
    } catch (error) {
      console.error('Google token verification error:', error);
      throw error;
    }
  }

  async verifyPasswordToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      console.error('Password token verification error:', error);
      throw error;
    }
  }

  generatePasswordToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });
  }

  getClientConfig() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    };
  }
}

module.exports = new AuthConfig(); 