/**
 * Users Module Routes (v2)
 * RESTful API endpoints for user management
 * 
 * Base path: /api/v2/users
 */

const express = require('express');
const router = express.Router();

// Import services
const userService = require('./services/user');
const profileService = require('./services/profile');
const personaService = require('./services/persona');
const completionService = require('./services/completion');
const permissionsService = require('./services/permissions');

// Import auth middleware from auth module
const { requireAuth, requirePermission, requireRole } = require('../auth/middleware');

// Import multer for file uploads
const upload = require('../../config/multer');

// =============================================================================
// CURRENT USER ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/users/me
 * Get current user's full profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await profileService.getFullProfile(req.userId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user profile', status: 500 }
    });
  }
});

/**
 * PATCH /api/v2/users/me
 * Update current user's profile
 */
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const user = await userService.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    
    const {
      // Base profile fields
      first_name, last_name, display_name, phone, address_line1, address_line2,
      city, state, postal_code, country, bio, website, birth_date, gender,
      nationality, languages_known, job_title, education, awards, memberships,
      timezone, social_facebook, social_instagram, social_tiktok, social_twitter,
      social_pinterest, social_whatsapp,
      // Type-specific fields will be handled separately
      ...typeSpecificFields
    } = req.body;
    
    // Validate required fields if updating base profile
    const baseFieldsProvided = first_name !== undefined || last_name !== undefined;
    if (baseFieldsProvided) {
      if (!first_name || !last_name) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'first_name and last_name are required', status: 400 }
        });
      }
      
      await profileService.updateBaseProfile(req.userId, {
        first_name, last_name, display_name, phone, address_line1, address_line2,
        city, state, postal_code, country, bio, website, birth_date, gender,
        nationality, languages_known, job_title, education, awards, memberships,
        timezone, social_facebook, social_instagram, social_tiktok, social_twitter,
        social_pinterest, social_whatsapp
      });
    }
    
    // Update type-specific profile
    const userType = user.user_type;
    
    if (userType === 'artist' || userType === 'admin') {
      const artistFields = Object.keys(typeSpecificFields).filter(k => 
        k.startsWith('artist_') || ['art_categories', 'art_mediums', 'does_custom', 'custom_details',
        'business_name', 'legal_name', 'tax_id', 'customer_service_email', 'studio_address_line1',
        'studio_address_line2', 'studio_city', 'studio_state', 'studio_zip', 'business_website',
        'business_phone', 'business_social_facebook', 'business_social_instagram',
        'business_social_tiktok', 'business_social_twitter', 'business_social_pinterest',
        'founding_date'].includes(k)
      );
      
      if (artistFields.length > 0) {
        const artistData = {};
        artistFields.forEach(k => { artistData[k] = typeSpecificFields[k]; });
        await profileService.updateArtistProfile(req.userId, artistData);
      }
    }
    
    if (userType === 'community' || userType === 'admin') {
      const communityFields = ['art_style_preferences', 'favorite_colors', 'art_interests', 'wishlist'];
      const communityData = {};
      communityFields.forEach(k => { if (typeSpecificFields[k] !== undefined) communityData[k] = typeSpecificFields[k]; });
      if (Object.keys(communityData).length > 0) {
        await profileService.updateCommunityProfile(req.userId, communityData);
      }
    }
    
    if (userType === 'promoter' || userType === 'admin') {
      const promoterFields = ['is_non_profit', 'organization_size', 'sponsorship_options', 'upcoming_events',
        'office_address_line1', 'office_address_line2', 'office_city', 'office_state', 'office_zip'];
      const promoterData = {};
      promoterFields.forEach(k => { if (typeSpecificFields[k] !== undefined) promoterData[k] = typeSpecificFields[k]; });
      if (Object.keys(promoterData).length > 0) {
        await profileService.updatePromoterProfile(req.userId, promoterData);
      }
    }
    
    res.json({ success: true, data: { message: 'Profile updated successfully' } });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user profile', status: 500 }
    });
  }
});

/**
 * GET /api/v2/users/me/completion
 * Get profile completion status
 */
router.get('/me/completion', requireAuth, async (req, res) => {
  try {
    const status = await completionService.getStatus(req.userId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error getting completion status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get completion status', status: 500 }
    });
  }
});

// =============================================================================
// PERSONA ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/users/me/personas
 * List current user's personas
 */
router.get('/me/personas', requireAuth, async (req, res) => {
  try {
    const personas = await personaService.list(req.userId);
    res.json({ success: true, data: personas });
  } catch (error) {
    console.error('Error listing personas:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list personas', status: 500 }
    });
  }
});

/**
 * GET /api/v2/users/me/personas/:id
 * Get specific persona
 */
router.get('/me/personas/:id', requireAuth, async (req, res) => {
  try {
    const persona = await personaService.findById(req.params.id, req.userId);
    
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: 'Persona not found', status: 404 }
      });
    }
    
    res.json({ success: true, data: persona });
  } catch (error) {
    console.error('Error fetching persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch persona', status: 500 }
    });
  }
});

/**
 * POST /api/v2/users/me/personas
 * Create new persona
 */
router.post('/me/personas', requireAuth, async (req, res) => {
  try {
    const persona = await personaService.create(req.userId, req.body);
    res.status(201).json({ success: true, data: persona });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('already have')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    console.error('Error creating persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create persona', status: 500 }
    });
  }
});

/**
 * PUT /api/v2/users/me/personas/:id
 * Update persona
 */
router.put('/me/personas/:id', requireAuth, async (req, res) => {
  try {
    await personaService.update(req.params.id, req.userId, req.body);
    res.json({ success: true, data: { message: 'Persona updated successfully' } });
  } catch (error) {
    if (error.message === 'Persona not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('required') || error.message.includes('already have')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    console.error('Error updating persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update persona', status: 500 }
    });
  }
});

/**
 * POST /api/v2/users/me/personas/:id/image
 * Upload persona profile image
 */
router.post('/me/personas/:id/image', 
  requireAuth, 
  upload.single('persona_image'),
  async (req, res) => {
    try {
      // Verify ownership
      const persona = await personaService.findById(req.params.id, req.userId);
      if (!persona) {
        return res.status(404).json({
          success: false,
          error: { code: 'PERSONA_NOT_FOUND', message: 'Persona not found', status: 404 }
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No image file provided', status: 400 }
        });
      }
      
      // Build the image URL path
      const imagePath = `/temp_images/profiles/${req.file.filename}`;
      
      // Update the persona with the new image path
      await personaService.update(req.params.id, req.userId, {
        ...persona,
        profile_image_url: imagePath
      });
      
      res.json({ 
        success: true, 
        data: { 
          image_url: imagePath,
          message: 'Image uploaded successfully' 
        } 
      });
    } catch (error) {
      console.error('Error uploading persona image:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upload image', status: 500 }
      });
    }
  }
);

/**
 * POST /api/v2/users/me/personas/upload-image
 * Upload persona image (for new personas before creation)
 */
router.post('/me/personas/upload-image', 
  requireAuth, 
  upload.single('persona_image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No image file provided', status: 400 }
        });
      }
      
      // Return the image path for use in persona creation
      const imagePath = `/temp_images/profiles/${req.file.filename}`;
      
      res.json({ 
        success: true, 
        data: { 
          image_url: imagePath,
          message: 'Image uploaded successfully' 
        } 
      });
    } catch (error) {
      console.error('Error uploading persona image:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upload image', status: 500 }
      });
    }
  }
);

/**
 * PATCH /api/v2/users/me/personas/:id/default
 * Set persona as default
 */
router.patch('/me/personas/:id/default', requireAuth, async (req, res) => {
  try {
    await personaService.setDefault(req.params.id, req.userId);
    res.json({ success: true, data: { message: 'Default persona updated successfully' } });
  } catch (error) {
    if (error.message === 'Persona not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: error.message, status: 404 }
      });
    }
    console.error('Error setting default persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to set default persona', status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/users/me/personas/:id
 * Delete persona
 */
router.delete('/me/personas/:id', requireAuth, async (req, res) => {
  try {
    await personaService.softDelete(req.params.id, req.userId);
    res.json({ success: true, data: { message: 'Persona deleted successfully' } });
  } catch (error) {
    if (error.message === 'Persona not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    console.error('Error deleting persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete persona', status: 500 }
    });
  }
});

// =============================================================================
// PUBLIC USER ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/users/:id
 * Get public profile for a user
 */
router.get('/:id', async (req, res) => {
  try {
    const profile = await profileService.getPublicProfile(req.params.id);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile', status: 500 }
    });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/users
 * List users (admin only)
 */
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { search, user_type, status, permissions, page, limit, sort_by, sort_order } = req.query;
    
    const result = await userService.list({
      search,
      userType: user_type,
      status: status || null, // Allow 'all' by passing null
      permissions: permissions ? permissions.split(',') : [],
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      sortBy: sort_by,
      sortOrder: sort_order,
    });
    
    // Fetch permissions for all users
    const userIds = result.users.map(u => u.id);
    const permissionsMap = await permissionsService.getMultiple(userIds);
    
    // Attach permissions to each user
    const usersWithPermissions = result.users.map(user => ({
      ...user,
      permissions: permissionsMap[user.id] || {}
    }));
    
    res.json({
      success: true,
      data: usersWithPermissions,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list users', status: 500 }
    });
  }
});

/**
 * GET /api/v2/users/:id/full
 * Get full user data (admin only)
 */
router.get('/:id/full', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const profile = await profileService.getFullProfile(req.params.id);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user', status: 500 }
    });
  }
});

/**
 * PUT /api/v2/users/:id
 * Update any user (admin only)
 */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    
    // Update user table fields
    const { user_type, status, email_verified, ...profileFields } = req.body;
    
    if (user_type || status || email_verified !== undefined) {
      await userService.update(req.params.id, { user_type, status, email_verified });
    }
    
    // Update profile fields
    if (Object.keys(profileFields).length > 0) {
      await profileService.updateBaseProfile(req.params.id, profileFields);
    }
    
    res.json({ success: true, data: { message: 'User updated successfully' } });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user', status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    
    await userService.softDelete(req.params.id);
    res.json({ success: true, data: { message: 'User deleted successfully' } });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user', status: 500 }
    });
  }
});

/**
 * GET /api/v2/users/:id/permissions
 * Get user permissions (admin only)
 */
router.get('/:id/permissions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const permissions = await permissionsService.get(req.params.id);
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch permissions', status: 500 }
    });
  }
});

/**
 * PUT /api/v2/users/:id/permissions
 * Update user permissions (admin only)
 */
router.put('/:id/permissions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    
    const updated = await permissionsService.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update permissions', status: 500 }
    });
  }
});

/**
 * GET /api/v2/users/by-permissions
 * Get users by permissions (for dropdowns, etc.)
 */
router.get('/by-permissions', requireAuth, async (req, res) => {
  try {
    const { permissions } = req.query;
    
    if (!permissions) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'permissions query parameter is required', status: 400 }
      });
    }
    
    const users = await userService.getByPermissions(permissions.split(','));
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users by permissions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users', status: 500 }
    });
  }
});

// =============================================================================
// ADMIN PERSONA ENDPOINTS
// =============================================================================

/**
 * GET /api/v2/users/admin/personas
 * List all personas system-wide (admin only)
 */
router.get('/admin/personas', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { 
      page, 
      limit, 
      search, 
      sort_by, 
      sort_order, 
      artist_id,
      include_inactive 
    } = req.query;
    
    const result = await personaService.adminList({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search: search || '',
      sortBy: sort_by || 'created_at',
      sortOrder: sort_order || 'desc',
      artistId: artist_id ? parseInt(artist_id) : null,
      includeInactive: include_inactive === 'true',
    });
    
    res.json({
      success: true,
      data: result.personas,
      meta: result.meta
    });
  } catch (error) {
    console.error('Error listing all personas:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list personas', status: 500 }
    });
  }
});

/**
 * GET /api/v2/users/admin/personas/:id
 * Get single persona with artist info (admin only)
 */
router.get('/admin/personas/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const persona = await personaService.adminFindById(req.params.id);
    
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: 'Persona not found', status: 404 }
      });
    }
    
    res.json({ success: true, data: persona });
  } catch (error) {
    console.error('Error fetching persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch persona', status: 500 }
    });
  }
});

/**
 * PUT /api/v2/users/admin/personas/:id
 * Update any persona (admin only)
 */
router.put('/admin/personas/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await personaService.adminUpdate(req.params.id, req.body);
    res.json({ success: true, data: { message: 'Persona updated successfully' } });
  } catch (error) {
    if (error.message === 'Persona not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('required') || error.message.includes('already')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    console.error('Error updating persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update persona', status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/users/admin/personas/:id
 * Delete any persona (admin only)
 */
router.delete('/admin/personas/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { hard } = req.query;
    await personaService.adminDelete(req.params.id, hard === 'true');
    res.json({ success: true, data: { message: 'Persona deleted successfully' } });
  } catch (error) {
    if (error.message === 'Persona not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'PERSONA_NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Cannot')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    console.error('Error deleting persona:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete persona', status: 500 }
    });
  }
});

module.exports = router;
