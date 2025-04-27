import { apiFetch } from './api';
import { tokenService } from './tokenService';

export const registrationService = {
  /**
   * Runs the checklist process
   * @param {string} userId - The user's ID
   * @returns {string} The path to redirect to
   */
  async runChecklist(userId) {
    if (!userId) {
      return '/login';
    }

    // Get user status
    const userStatus = await this.getUserStatus();
    if (userStatus.status !== 'active') {
      return '/registration';
    }

    // Check profile
    const profileResponse = await apiFetch(`/users/${userId}/profile`);
    if (!profileResponse.ok) {
      return '/profile';
    }

    // Check terms
    const termsResponse = await apiFetch(`/users/${userId}/terms`);
    if (!termsResponse.ok) {
      return '/terms';
    }

    // Check email verification
    const emailResponse = await apiFetch(`/users/${userId}/email-verification`);
    if (!emailResponse.ok) {
      return '/verify-email';
    }

    // All tests passed
    return '/dashboard';
  },

  /**
   * Gets the user's status
   * @returns {Promise<Object>} The user status
   */
  async getUserStatus() {
    const response = await apiFetch('/users/status');
    return await response.json();
  }
}; 