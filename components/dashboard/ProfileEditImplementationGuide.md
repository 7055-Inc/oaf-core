# Profile Edit Implementation Guide

## Overview
Rebuilding the edit profile functionality within the new slide-in dashboard architecture, ensuring every API field is captured and proper permissions are enforced.

## API Endpoint: PATCH /users/me
- **File**: `api-service/src/routes/users.js` lines 139-384 ✅ ENHANCED
- **Supports**: FormData with file uploads (profile_image, header_image, logo_image)
- **Updates**: Multiple tables based on user_type
- **Enhancement**: Added missing schema fields (legal_name, tax_id, customer_service_email, office_address fields)

## Database Schema Summary

### users table
- `user_type`: enum('artist','promoter','community','admin','Draft')

### user_profiles table (ALL users)
**Personal**: first_name*, last_name*, display_name, phone, birth_date, gender (ENUM), nationality
**Address**: address_line1, address_line2, city, state, postal_code, country
**Contact**: website, bio, job_title, timezone (IANA format with constraint)
**Social**: social_facebook, social_instagram, social_tiktok, social_twitter, social_pinterest, social_whatsapp
**Complex JSON**: languages_known, education, awards, memberships
**Images**: profile_image_path, header_image_path

### artist_profiles table
**Business**: business_name, legal_name, tax_id, founding_date, logo_path
**Studio**: studio_address_line1, studio_address_line2, studio_city, studio_state, studio_zip
**Contact**: business_phone, business_website, customer_service_email
**Social**: business_social_facebook, business_social_instagram, business_social_tiktok, business_social_twitter, business_social_pinterest
**Art**: art_categories (JSON), art_mediums (JSON), artist_biography
**Custom**: does_custom (enum yes/no), custom_details

### promoter_profiles table
**Business**: business_name, legal_name, tax_id, founding_date, logo_path
**Contact**: business_phone, business_website
**Social**: business_social_facebook, business_social_instagram, business_social_tiktok, business_social_twitter, business_social_pinterest
**Office**: office_address_line1, office_address_line2, office_city, office_state, office_zip
**Organization**: is_non_profit (enum yes/no), organization_size
**Events**: upcoming_events (JSON), sponsorship_options (JSON)

### community_profiles table
**Preferences**: art_style_preferences (JSON), favorite_colors (JSON)
**Interests**: art_interests (JSON), wishlist (JSON)

## Permission System
**Source**: `pages/dashboard/index.js` lines 125-131
```javascript
const isAdmin = userData.user_type === 'admin';
// Admin can edit ALL profile types

// Section visibility:
// Base Profile: ALL users
// Artist Profile: userData.user_type === 'artist' || isAdmin
// Promoter Profile: userData.user_type === 'promoter' || isAdmin  
// Community Profile: userData.user_type === 'community' || isAdmin
```

## Working Logic Sources
1. **File Uploads**: `components/dashboard/menu/MyAccount.js` lines 335-352
2. **Form Handling**: `components/dashboard/menu/MyAccount.js` lines 354-399
3. **API Integration**: Both MyAccount.js and `pages/profile/edit.js`
4. **Validation**: 5MB file limit, required fields (first_name, last_name)

## Global CSS Available (styles/global.css)
- `input, select, textarea` - Standardized form elements
- `button` - Primary gradient styling
- `button.secondary` - Secondary button style
- `.form-card` - Grouped form sections
- `.error-alert`, `.success-alert` - Status messages

## Slide-in Architecture Integration
**File**: `components/dashboard/my-account/components/EditProfile.js`
- **Current**: 1200+ lines, comprehensive profile editor ✅ COMPLETED
- **Features**: Full-featured profile editor with all API fields and sections
- **Integration**: Uses openSlideIn('edit-profile', { title: 'Edit Profile' }) ✅

## Implementation Checklist

### Phase 1: Infrastructure ✓ Planned
- [ ] Read existing working implementations
- [ ] Extract file upload logic
- [ ] Map all API fields to components
- [ ] Design component architecture

### Phase 2: Base Profile Section
- [ ] Personal information fields
- [ ] Address fields  
- [ ] Contact fields
- [ ] Social media fields
- [ ] Complex JSON fields (languages, education, awards, memberships)
- [ ] Profile & header image uploads

### Phase 3: Artist Profile Section
- [ ] Permission check: (userData.user_type === 'artist' || isAdmin)
- [ ] Business information
- [ ] Studio address
- [ ] Business contact & social
- [ ] Art categories & mediums (JSON arrays)
- [ ] Custom work settings
- [ ] Logo upload

### Phase 4: Promoter Profile Section  
- [ ] Permission check: (userData.user_type === 'promoter' || isAdmin)
- [ ] Business information
- [ ] Office address
- [ ] Business contact & social
- [ ] Organization details
- [ ] Events & sponsorship (JSON arrays)
- [ ] Logo upload

### Phase 5: Community Profile Section
- [ ] Permission check: (userData.user_type === 'community' || isAdmin)
- [ ] Art preferences (JSON arrays)
- [ ] Interests & wishlist (JSON arrays)

### Phase 6: Integration & Testing
- [ ] Form validation
- [ ] API integration with FormData
- [ ] Error handling
- [ ] Test all user types
- [ ] Test file uploads
- [ ] Test JSON field handling

## Critical Implementation Notes
1. **Preserve existing API call patterns** from working implementations
2. **Use FormData** for file uploads (profile_image, header_image, logo_image)
3. **JSON fields** require JSON.stringify() before sending
4. **File size validation**: 5MB limit with user feedback
5. **Required fields**: first_name, last_name minimum
6. **Admin users** can edit any profile type
7. **Success feedback**: Show alert/message after successful update

## File References
- API: `api-service/src/routes/users.js` (PATCH /users/me)
- Working Logic: `components/dashboard/menu/MyAccount.js` (ProfileEditContent)
- Full Implementation: `pages/profile/edit.js`
- Target File: `components/dashboard/my-account/components/EditProfile.js`
- Styles: `styles/global.css`
- Architecture: `components/dashboard/DashboardArchitecture.md`
