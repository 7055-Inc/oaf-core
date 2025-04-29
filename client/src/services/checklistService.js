import { apiFetch } from './api';

/**
 * Checklist Service
 * 
 * Handles the user verification checklist that runs after successful login.
 * This service will check user status and handle redirects as needed.
 * Only returns back to auth context when all checks are complete.
 */
export const checklistService = {
  /**
   * Run the checklist process for a user
   * This will check user status and handle any necessary redirects
   * 
   * @param {Object} user - The API user object
   * @returns {Promise<void>} - Resolves when all checks are complete
   * @throws {Error} - If there's an unrecoverable error
   */
  async runChecklist(user) {
    console.log('ChecklistService: Starting checklist process for user:', user.id);
    
    try {
      const response = await apiFetch('/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profileData = await response.json();
      console.log('ChecklistService: User status check:', profileData.user?.status);

      // If user is draft, redirect to registration to complete profile
      if (profileData.user?.status === 'draft') {
        console.log('ChecklistService: User is draft, redirecting to registration');
        window.location.href = '/register';
        // Never return - the redirect will cause a new auth cycle
        return new Promise(() => {}); // Hang here while redirect happens
      }

      // If user is active, proceed to dashboard
      if (profileData.user?.status === 'active') {
        console.log('ChecklistService: User is active, proceeding to dashboard');
        window.location.href = '/dashboard';
        return new Promise(() => {}); // Hang here while redirect happens
      }

      // If we get here, something unexpected happened
      console.error('ChecklistService: Unexpected user status:', profileData.user?.status);
      throw new Error('Unexpected user status');
    } catch (error) {
      console.error('ChecklistService: Error during status check:', error);
      throw error;
    }
  }
}; 