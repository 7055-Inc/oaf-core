import { authService } from '../services/authService';

export const loginChecklist = {
  async checkUser(user) {
    try {
      // Check if user is valid
      if (!user || !user.id) {
        console.log('Login checklist: Invalid user');
        return {
          passed: false,
          redirect: '/login'
        };
      }

      // Check email verification
      const isVerified = await authService.verifyEmail(user.email);
      if (!isVerified) {
        console.log('Login checklist: Email not verified');
        return {
          passed: false,
          redirect: '/register'
        };
      }

      // Check required profile fields
      const missingFields = await this.checkRequiredFields(user);
      if (missingFields.length > 0) {
        console.log('Login checklist: Missing required fields', missingFields);
        return {
          passed: false,
          showModal: true,
          missingFields
        };
      }

      console.log('Login checklist: All checks passed');
      return { passed: true };
    } catch (error) {
      console.error('Login checklist error:', error);
      return {
        passed: false,
        redirect: '/login'
      };
    }
  },

  async checkRequiredFields(user) {
    const missingFields = [];
    
    try {
      // Get user profile
      const profile = await authService.getUserProfile(user.id);
      
      // Check basic profile fields
      if (!profile.first_name) missingFields.push('first_name');
      if (!profile.last_name) missingFields.push('last_name');
      if (!profile.phone) missingFields.push('phone');
      if (!profile.address) missingFields.push('address');
      
      // Check role-specific fields
      switch (user.user_type) {
        case 'artist':
          if (!profile.artist_name) missingFields.push('artist_name');
          if (!profile.artist_bio) missingFields.push('artist_bio');
          if (!profile.artist_website) missingFields.push('artist_website');
          break;
          
        case 'promoter':
          if (!profile.organization_name) missingFields.push('organization_name');
          if (!profile.organization_type) missingFields.push('organization_type');
          if (!profile.organization_website) missingFields.push('organization_website');
          break;
          
        case 'community':
          if (!profile.community_name) missingFields.push('community_name');
          if (!profile.community_type) missingFields.push('community_type');
          if (!profile.community_website) missingFields.push('community_website');
          break;
      }
    } catch (error) {
      console.error('Error checking required fields:', error);
    }
    
    return missingFields;
  }
}; 