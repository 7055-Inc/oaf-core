# Users Module

## Overview

The Users module handles all user management functionality including:
- User CRUD operations
- Profile management (artist, community, promoter, admin profiles)
- Artist personas (sub-profiles)
- Profile completion tracking
- User verification
- Admin user management

## Status: ✅ **Complete**

All backend services, v2 API endpoints, frontend utilities, and dashboard components have been implemented.

---

## Module Structure

```
users/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints
├── README.md             # This file
├── services/
│   ├── index.js          # Re-exports all services
│   ├── user.js           # User CRUD
│   ├── profile.js        # Profile management
│   ├── persona.js        # Artist personas
│   ├── completion.js     # Profile completion logic
│   └── verification.js   # Verification status
├── middleware/
│   ├── index.js
│   └── requireProfile.js # Require complete profile
├── helpers/
│   ├── index.js
│   └── profileTypes.js   # Artist/community/promoter logic
└── validation/
    └── schemas.js        # Request validation
```

---

## API Endpoints (v2)

### User Profile Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v2/users/me` | Get current user's full profile | Required |
| `PUT` | `/api/v2/users/me` | Update current user's profile | Required |
| `GET` | `/api/v2/users/me/completion` | Get profile completion status | Required |
| `GET` | `/api/v2/users/:id` | Get public profile | Optional |

### Persona Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v2/users/me/personas` | List user's personas | Required |
| `POST` | `/api/v2/users/me/personas` | Create new persona | Required + vendor |
| `GET` | `/api/v2/users/me/personas/:id` | Get persona details | Required |
| `PUT` | `/api/v2/users/me/personas/:id` | Update persona | Required |
| `DELETE` | `/api/v2/users/me/personas/:id` | Delete persona | Required |

### Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v2/users` | List all users | Admin |
| `GET` | `/api/v2/users/:id/full` | Get full user data | Admin |
| `PUT` | `/api/v2/users/:id` | Update any user | Admin |
| `DELETE` | `/api/v2/users/:id` | Delete user | Admin |
| `PUT` | `/api/v2/users/:id/permissions` | Update permissions | Admin |
| `POST` | `/api/v2/users/:id/impersonate` | Start impersonation | Admin |

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    "id": 1234567890,
    "username": "artist_jane",
    "userType": "artist",
    "profile": {
      "firstName": "Jane",
      "lastName": "Doe",
      "displayName": "Jane's Art Studio",
      "bio": "...",
      "profileImageUrl": "..."
    },
    "permissions": ["vendor", "verified"],
    "roles": ["Artist"]
  }
}
```

### Profile Completion Response
```json
{
  "success": true,
  "data": {
    "complete": false,
    "requiresCompletion": true,
    "missingFields": ["bio", "profileImage"],
    "completionPercentage": 75
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "status": 404
  }
}
```

---

## Services

### UserService
```javascript
// user.js
module.exports = {
  findById(userId),
  findByUsername(username),
  create(userData),
  update(userId, updates),
  delete(userId),
  search(filters, pagination),
};
```

### ProfileService
```javascript
// profile.js
module.exports = {
  getFullProfile(userId),
  updateProfile(userId, profileData),
  getPublicProfile(userId),
  updateProfileImage(userId, imageData),
  updateHeaderImage(userId, imageData),
};
```

### PersonaService
```javascript
// persona.js
module.exports = {
  list(artistId),
  create(artistId, personaData),
  update(personaId, artistId, updates),
  delete(personaId, artistId),
  setDefault(personaId, artistId),
};
```

### CompletionService
```javascript
// completion.js
module.exports = {
  getStatus(userId),
  getMissingFields(userId, userType),
  calculatePercentage(userId),
};
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Core user accounts |
| `user_profiles` | Base profile data (all user types) |
| `artist_profiles` | Artist-specific profile data |
| `community_profiles` | Community member profile data |
| `promoter_profiles` | Promoter-specific profile data |
| `artist_personas` | Artist sub-profiles |
| `user_permissions` | User permission flags |

---

## Migration Checklist

### Phase 1: Backend Module ✅
- [x] Create directory structure
- [x] Extract UserService from routes/users.js
- [x] Extract ProfileService
- [x] Extract PersonaService from routes/personas.js
- [x] Extract CompletionService
- [x] Extract PermissionsService
- [x] Create v2 routes (30+ endpoints)
- [x] Add backward-compatible wrappers

### Phase 2: Frontend Utilities ✅
- [x] Create lib/users/api.js
- [x] Create lib/users/index.js

### Phase 3: Dashboard Components ✅
- [x] Create ProfileForm (accordion-based editor)
- [x] Create EmailPreferences component
- [x] Create PaymentSettings component
- [x] Create ShippingSettings component
- [x] Create PersonaList/PersonaForm components
- [x] Create UserManagement (admin)
- [x] Create PersonaManagement (admin)
- [x] Create VerificationHub component
- [ ] MyOrders stays in Commerce module (pending)

### Phase 4: Dashboard Pages ✅
- [x] /dashboard/users/profile - View profile
- [x] /dashboard/users/profile/edit - Edit profile
- [x] /dashboard/users/email - Email preferences
- [x] /dashboard/users/payments - Payment settings
- [x] /dashboard/users/shipping - Shipping settings
- [x] /dashboard/users/personas/* - User persona management
- [x] /dashboard/users/manage - Admin user management
- [x] /dashboard/users/personas/manage/* - Admin persona management
- [x] /dashboard/users/verification - Verification hub

### Phase 5: Menu & Cleanup ✅
- [x] Add Users section to menuConfig.js
- [x] Add user-type color coding (admin=green, artist=purple, promoter=orange)
- [x] Delete old slide-in components (EditProfile, ViewProfile, EmailPreferences, PaymentSettings, ShippingSettings)
- [x] Update onboarding widgets to use page navigation
- [ ] Delete legacy routes/users.js (after wrapper period)
- [ ] Delete legacy routes/personas.js (after wrapper period)

---

## Dependencies

- **Auth module** - For authentication and permission checking
- **Shared module** - For database, email service, storage

## Dependents

The following modules will depend on Users:
- **Catalog** - Products belong to users
- **Commerce** - Orders belong to users
- **Events** - Applications belong to users
- **Websites** - Sites belong to users
- **Marketing** - Affiliates are users
