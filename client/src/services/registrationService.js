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

    try {
      // Check user status
      const profileResponse = await apiFetch('/user/profile');
      if (!profileResponse.ok) {
        return '/registration';
      }

      const profileData = await profileResponse.json();
      
      // If user is in draft status, redirect to registration
      if (profileData.user?.status === 'draft') {
        return '/registration';
      }

      // If user is active, proceed to dashboard
      if (profileData.user?.status === 'active') {
        return '/dashboard';
      }

      // Default to registration for any other status
      return '/registration';
    } catch (error) {
      console.error('Registration checklist error:', error);
      return '/registration';
    }
  },

  /**
   * Updates a single field in the user profile during registration
   * @param {string} userId - The user's ID
   * @param {string} fieldId - The field to update
   * @param {any} value - The new value
   */
  async updateUserProfile(userId, fieldId, value) {
    const response = await apiFetch('/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [fieldId]: value
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile field ${fieldId}`);
    }

    return response.json();
  },

  /**
   * Completes the registration process by setting user status to active
   * and saving all final profile data
   * @param {string} userId - The user's ID
   * @param {Object} finalData - The complete user profile data
   */
  async completeRegistration(userId, finalData) {
    // First update the complete profile data
    const profileResponse = await apiFetch('/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...finalData,
        status: 'active'  // Set status to active
      })
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to save final profile data');
    }

    // Return to checklist service for next steps
    return this.runChecklist(userId);
  }
}; 