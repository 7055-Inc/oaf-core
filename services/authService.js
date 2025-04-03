const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

class AuthService {
  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async verifyGoogleToken(token) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      return ticket.getPayload();
    } catch (error) {
      console.error('Error verifying Google token:', error);
      throw new Error('Invalid token');
    }
  }

  async verifyPasswordToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      console.error('Error verifying password token:', error);
      throw new Error('Invalid token');
    }
  }

  async getUserByEmail(email) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [email]);
      return rows[0];
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUserByGoogleId(googleId) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE google_uid = ?', [googleId]);
      return rows[0];
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const { email, google_uid, user_type = 'community' } = userData;
      const [result] = await db.query(
        'INSERT INTO users (username, google_uid, user_type) VALUES (?, ?, ?)',
        [email, google_uid, user_type]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserSession(userId, sessionData) {
    try {
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Error updating user session:', error);
      throw error;
    }
  }
}

module.exports = new AuthService(); 