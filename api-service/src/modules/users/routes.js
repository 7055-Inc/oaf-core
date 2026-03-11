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
 * Accepts multipart/form-data (for image uploads) or JSON
 */
router.patch('/me', requireAuth, upload.fields([
  { name: 'profile_image', maxCount: 1 },
  { name: 'header_image', maxCount: 1 },
  { name: 'logo_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const user = await userService.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }

    // FormData sends arrays as JSON strings -- parse them back
    const arrayFields = [
      'languages_known', 'education', 'art_categories', 'art_mediums',
      'art_style_preferences', 'favorite_colors', 'art_interests', 'wishlist'
    ];
    for (const field of arrayFields) {
      if (typeof req.body[field] === 'string') {
        try { req.body[field] = JSON.parse(req.body[field]); } catch (_) { /* leave as-is */ }
      }
    }

    // Handle uploaded image files
    if (req.files) {
      if (req.files.profile_image && req.files.profile_image[0]) {
        req.body.profile_image_path = `/temp_images/profiles/${req.files.profile_image[0].filename}`;
      }
      if (req.files.header_image && req.files.header_image[0]) {
        req.body.header_image_path = `/temp_images/profiles/${req.files.header_image[0].filename}`;
      }
      if (req.files.logo_image && req.files.logo_image[0]) {
        req.body.logo_path = `/temp_images/profiles/${req.files.logo_image[0].filename}`;
      }
    }
    
    const {
      // Base profile fields
      first_name, last_name, display_name, phone, address_line1, address_line2,
      city, state, postal_code, country, bio, website, birth_date, gender,
      nationality, languages_known, job_title, education, awards, memberships,
      timezone, social_facebook, social_instagram, social_tiktok, social_twitter,
      social_pinterest, social_whatsapp,
      profile_image_path, header_image_path, logo_path,
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
      
      const baseUpdate = {
        first_name, last_name, display_name, phone, address_line1, address_line2,
        city, state, postal_code, country, bio, website, birth_date, gender,
        nationality, languages_known, job_title, education, awards, memberships,
        timezone, social_facebook, social_instagram, social_tiktok, social_twitter,
        social_pinterest, social_whatsapp
      };
      if (profile_image_path) baseUpdate.profile_image_path = profile_image_path;
      if (header_image_path) baseUpdate.header_image_path = header_image_path;
      if (logo_path) baseUpdate.logo_path = logo_path;
      
      await profileService.updateBaseProfile(req.userId, baseUpdate);
    } else if (profile_image_path || header_image_path || logo_path) {
      const imageUpdate = {};
      if (profile_image_path) imageUpdate.profile_image_path = profile_image_path;
      if (header_image_path) imageUpdate.header_image_path = header_image_path;
      if (logo_path) imageUpdate.logo_path = logo_path;
      await profileService.updateBaseProfile(req.userId, imageUpdate);
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
        artistFields.forEach(k => {
          // Frontend sends artist_* aliases (artist_business_name, artist_business_social_*, etc.)
          // while the artist profile service persists unprefixed DB field names.
          if (k.startsWith('artist_') && k !== 'artist_biography') {
            artistData[k.replace(/^artist_/, '')] = typeSpecificFields[k];
            return;
          }
          artistData[k] = typeSpecificFields[k];
        });
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
        'office_address_line1', 'office_address_line2', 'office_city', 'office_state', 'office_zip',
        'business_name', 'legal_name', 'tax_id', 'business_phone', 'business_website',
        'business_social_facebook', 'business_social_instagram', 'business_social_tiktok',
        'business_social_twitter', 'business_social_pinterest', 'founding_date'];
      const promoterAliasFields = Object.keys(typeSpecificFields).filter(k => k.startsWith('promoter_'));
      const promoterData = {};
      promoterFields.forEach(k => { if (typeSpecificFields[k] !== undefined) promoterData[k] = typeSpecificFields[k]; });
      promoterAliasFields.forEach(k => {
        promoterData[k.replace(/^promoter_/, '')] = typeSpecificFields[k];
      });
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

/**
 * PATCH /api/v2/users/me/complete-profile
 * Update missing profile fields during profile completion flow
 */
router.patch('/me/complete-profile', requireAuth, async (req, res) => {
  try {
    const baseFields = ['first_name', 'last_name', 'phone', 'address_line1', 'city', 'state', 'postal_code'];
    const updates = {};
    for (const field of baseFields) {
      if (req.body[field] !== undefined) {
        if (!req.body[field] || req.body[field].trim() === '') {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: `${field.replace(/_/g, ' ')} cannot be empty`, status: 400 }
          });
        }
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await profileService.updateBaseProfile(req.userId, updates);
    }

    if (req.body.business_name) {
      const user = await userService.findById(req.userId);
      if (user.user_type === 'artist') {
        await profileService.updateArtistProfile(req.userId, { business_name: req.body.business_name });
      } else if (user.user_type === 'promoter') {
        await profileService.updatePromoterProfile(req.userId, { business_name: req.body.business_name });
      }
    }

    res.json({ success: true, data: { message: 'Profile updated successfully' } });
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to complete profile', status: 500 }
    });
  }
});

/**
 * POST /api/v2/users/me/select-user-type
 * One-time user type selection for Draft users
 */
router.post('/me/select-user-type', requireAuth, async (req, res) => {
  try {
    const { user_type } = req.body;
    const validTypes = ['artist', 'promoter', 'community'];
    if (!user_type || !validTypes.includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid user type. Must be one of: artist, promoter, community', status: 400 }
      });
    }

    const user = await userService.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 }
      });
    }
    if (user.user_type !== 'Draft') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_SET', message: 'User type has already been selected', status: 400 }
      });
    }

    await userService.updateUserType(req.userId, user_type);
    res.json({ success: true, data: { message: 'User type updated successfully', user_type } });
  } catch (error) {
    console.error('Error selecting user type:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user type', status: 500 }
    });
  }
});

// =============================================================================
// PUBLIC ARTISTS ENDPOINT (for carousels, featured sections)
// =============================================================================

/**
 * GET /api/v2/users/artists
 * Get list of active artists for public display (carousels, featured sections)
 * No authentication required
 * 
 * @query {number} limit - Max results (default: 20, max: 100)
 * @query {boolean} random - Randomize order (default: true)
 */
router.get('/artists', async (req, res) => {
  try {
    const { limit = 20, random = 'true' } = req.query;
    const searchLimit = Math.min(parseInt(limit) || 20, 100);
    const useRandom = random === 'true';
    
    const artists = await userService.getPublicArtists({ limit: searchLimit, random: useRandom });
    
    res.json({
      success: true,
      data: artists,
      meta: { count: artists.length, limit: searchLimit }
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch artists', status: 500 }
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

// ============================================================================
// EMAIL PREFERENCES
// ============================================================================

/**
 * GET /api/v2/users/email-preferences
 */
router.get('/email-preferences', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    const [preferences] = await db.execute(
      'SELECT * FROM user_email_preferences WHERE user_id = ?', [req.userId]
    );
    const data = preferences.length === 0
      ? { frequency: 'weekly', is_enabled: true, categories: 'all' }
      : preferences[0];
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/v2/users/email-preferences
 */
router.put('/email-preferences', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    const { frequency, is_enabled, categories } = req.body;

    const validFrequencies = ['live', 'hourly', 'daily', 'weekly'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid frequency value' } });
    }

    let categoriesJson = categories;
    if (typeof categories === 'object' && categories !== null) {
      categoriesJson = JSON.stringify(categories);
    } else if (typeof categories === 'string') {
      try { JSON.parse(categories); categoriesJson = categories; } catch (e) { categoriesJson = JSON.stringify(categories); }
    }

    const [existing] = await db.execute(
      'SELECT id, frequency, is_enabled, categories FROM user_email_preferences WHERE user_id = ?', [req.userId]
    );

    let oldPreferences = {};
    if (existing.length > 0) {
      oldPreferences = { frequency: existing[0].frequency, is_enabled: Boolean(existing[0].is_enabled), categories: existing[0].categories || {} };
      await db.execute('UPDATE user_email_preferences SET frequency = ?, is_enabled = ?, categories = ? WHERE user_id = ?',
        [frequency, is_enabled, categoriesJson, req.userId]);
    } else {
      await db.execute('INSERT INTO user_email_preferences (user_id, frequency, is_enabled, categories) VALUES (?, ?, ?, ?)',
        [req.userId, frequency, is_enabled, categoriesJson]);
    }

    const newPreferences = { frequency, is_enabled, categories: JSON.parse(categoriesJson) };
    await db.execute(
      'INSERT INTO user_email_preference_log (user_id, changed_by_user_id, changed_by_admin, old_preferences, new_preferences, change_reason) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, req.userId, 0, JSON.stringify(oldPreferences), JSON.stringify(newPreferences), 'User preference update']
    );

    res.json({ success: true, data: { message: 'Email preferences updated successfully' } });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/users/email-preferences/bounce-status
 */
router.get('/email-preferences/bounce-status', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    const [user] = await db.execute('SELECT username FROM users WHERE id = ?', [req.userId]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const [bounceData] = await db.execute('SELECT * FROM bounce_tracking WHERE email_address = ?', [user[0].username]);

    const data = bounceData.length === 0
      ? { is_blacklisted: false, hard_bounces: 0, soft_bounces: 0, last_bounce_at: null, bounce_count: 0, bounce_type: null }
      : {
          is_blacklisted: bounceData[0].is_blacklisted,
          hard_bounces: bounceData[0].bounce_type === 'hard' ? bounceData[0].bounce_count : 0,
          soft_bounces: bounceData[0].bounce_type === 'soft' ? bounceData[0].bounce_count : 0,
          last_bounce_at: bounceData[0].last_bounce_date,
          bounce_count: bounceData[0].bounce_count,
          bounce_type: bounceData[0].bounce_type,
          last_error: bounceData[0].last_error
        };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error checking bounce status:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/users/email-preferences/reactivate
 */
router.post('/email-preferences/reactivate', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    const [user] = await db.execute('SELECT username FROM users WHERE id = ?', [req.userId]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const userEmail = user[0].username;
    await db.execute('UPDATE bounce_tracking SET is_blacklisted = FALSE, bounce_count = 0 WHERE email_address = ?', [userEmail]);
    await db.execute(
      'INSERT INTO email_log (user_id, email_address, template_id, subject, status) VALUES (?, ?, NULL, ?, ?)',
      [req.userId, userEmail, 'Email Reactivation Request', 'sent']
    );

    res.json({ success: true, data: { message: 'Email reactivation request processed successfully' } });
  } catch (error) {
    console.error('Error processing reactivation:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// =============================================================================
// WILDCARD :id ROUTES (must be LAST to avoid shadowing named routes)
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
    
    const { user_type, status, email_verified, ...profileFields } = req.body;
    
    if (user_type || status || email_verified !== undefined) {
      await userService.update(req.params.id, { user_type, status, email_verified });
    }
    
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

// ============================================================================
// IMPERSONATION ROUTES
// ============================================================================

const jwt = require('jsonwebtoken');
const db = require('../../../config/db');

/**
 * POST /api/v2/users/impersonate/:userId
 * Start impersonating a user (admin only)
 */
router.post('/impersonate/:userId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const adminUserId = req.userId;
    const { reason } = req.body;

    if (targetUserId === adminUserId) {
      return res.status(400).json({ success: false, error: 'Cannot impersonate yourself' });
    }

    const [targetUser] = await db.execute(
      'SELECT id, username, user_type FROM users WHERE id = ?',
      [targetUserId]
    );

    if (!targetUser || targetUser.length === 0) {
      return res.status(404).json({ success: false, error: 'Target user not found' });
    }

    const [targetTypes] = await db.query('SELECT type FROM user_types WHERE user_id = ?', [targetUserId]);
    const targetRoles = [targetUser[0]?.user_type, ...(targetTypes?.map(t => t.type) || [])].filter(Boolean);

    if (targetRoles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Cannot impersonate another administrator' });
    }

    const [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [targetUserId]);
    const permissions = [];
    if (userPermissions[0]) {
      const permKeys = ['vendor', 'events', 'stripe_connect', 'manage_sites', 'manage_content',
        'manage_system', 'verified', 'marketplace', 'shipping', 'sites', 'professional_sites'];
      for (const key of permKeys) {
        if (userPermissions[0][key]) permissions.push(key);
      }
    }

    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const [result] = await db.execute(
      `INSERT INTO admin_impersonation_log 
       (admin_user_id, impersonated_user_id, reason, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [adminUserId, targetUserId, reason || null, clientIp, userAgent]
    );

    const impersonationToken = jwt.sign(
      {
        userId: targetUserId,
        originalUserId: adminUserId,
        isImpersonating: true,
        impersonationLogId: result.insertId,
        username: targetUser[0].username,
        roles: targetRoles,
        permissions: permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`Admin ${adminUserId} started impersonating user ${targetUserId}`);

    res.json({
      success: true,
      token: impersonationToken,
      impersonatedUser: {
        id: targetUserId,
        username: targetUser[0].username,
        user_type: targetUser[0].user_type
      },
      impersonationLogId: result.insertId,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Error starting impersonation:', error);
    res.status(500).json({ success: false, error: 'Failed to start impersonation' });
  }
});

/**
 * POST /api/v2/users/stop-impersonation
 * Stop impersonating and return to admin session
 */
router.post('/stop-impersonation', requireAuth, async (req, res) => {
  try {
    if (!req.isImpersonating || !req.originalUserId) {
      return res.status(400).json({ success: false, error: 'Not currently impersonating a user' });
    }

    if (req.impersonationLogId) {
      await db.execute(
        'UPDATE admin_impersonation_log SET ended_at = NOW() WHERE id = ?',
        [req.impersonationLogId]
      );
    }

    console.log(`Admin ${req.originalUserId} stopped impersonating user ${req.userId}`);

    res.json({
      success: true,
      message: 'Impersonation session ended',
      adminUserId: req.originalUserId
    });
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    res.status(500).json({ success: false, error: 'Failed to stop impersonation' });
  }
});

/**
 * GET /api/v2/users/impersonation-history
 * Get impersonation history logs (admin only)
 */
router.get('/impersonation-history', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const [logs] = await db.execute(
      `SELECT 
        l.id, l.admin_user_id, admin.username as admin_username,
        l.impersonated_user_id, impersonated.username as impersonated_username,
        l.started_at, l.ended_at, l.duration_seconds,
        l.reason, l.ip_address, l.session_active
      FROM admin_impersonation_log l
      JOIN users admin ON l.admin_user_id = admin.id
      JOIN users impersonated ON l.impersonated_user_id = impersonated.id
      ORDER BY l.started_at DESC
      LIMIT ?`,
      [limit]
    );

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching impersonation history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch impersonation history' });
  }
});

module.exports = router;
