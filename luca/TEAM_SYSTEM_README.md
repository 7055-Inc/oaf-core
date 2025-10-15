# 🤝 Luca Team System Documentation

## Overview

The Luca Team System enables data sharing between users while maintaining security and ownership. Team owners can invite other users to access their materials, products, and collections with granular permissions.

## ✅ Features Implemented

### 🔐 **Secure Team Access**
- JWT-based authentication (uses existing main app auth)
- Owner maintains full control of their data
- Granular role-based permissions
- Team member activity logging

### 👥 **Team Management**
- Create teams with custom names and descriptions
- Invite users via email with specific roles
- Remove team members (owner/admin only)
- View team activity and member status

### 🎯 **Permission Levels**
- **Owner**: Full access to everything (cannot be removed)
- **Admin**: Full access + can invite/remove members
- **Editor**: Can edit materials and products, view collections/shipping
- **Viewer**: Read-only access to all data

### 📊 **Data Access**
- All existing queries automatically support team access
- Data shows with `access_type` field (`owner` vs `shared`)
- Team members see combined data from all accessible teams
- Original data ownership preserved

## 🚀 API Endpoints

### Team Management
```bash
# Get user's teams
GET /api/teams/my-teams

# Create new team
POST /api/teams/create
{
  "name": "My Design Team",
  "description": "Collaborative workspace for design projects"
}

# Get team details
GET /api/teams/:teamId

# Invite user to team
POST /api/teams/:teamId/invite
{
  "email": "user@example.com",
  "role": "editor"
}

# Accept invitation
POST /api/teams/invitations/:token/accept

# Remove team member
DELETE /api/teams/:teamId/members/:memberId
```

### Data Access (Existing Endpoints Enhanced)
```bash
# All existing endpoints now return team-shared data
GET /api/materials        # Returns own + team materials
GET /api/products         # Returns own + team products  
GET /api/categories       # Returns own + team categories
```

## 🛠️ Implementation Details

### Database Schema
- `teams` - Team definitions with owner
- `team_members` - User memberships with roles/permissions
- `team_invitations` - Pending invitations with expiry
- `team_activity_log` - Audit trail of team actions

### Auth Middleware Enhancement
```javascript
// Before: Single user access
WHERE user_id = ?

// After: Team-aware access  
WHERE user_id IN (?, ?, ?) // user + accessible team owners
```

### Permission System
```json
{
  "materials": "edit|view",
  "products": "edit|view", 
  "collections": "edit|view",
  "shipping": "edit|view",
  "reports": "view"
}
```

## 🎨 Frontend Integration

### React Component Usage
```jsx
import TeamManager from './components/TeamManager';

<TeamManager 
  apiBaseUrl="/api"
  authToken={userToken}
/>
```

### API Integration
```javascript
// The middleware automatically adds team context
req.accessibleUserIds // [userId, teamOwner1, teamOwner2, ...]
req.getTeamPermissions(ownerUserId) // Returns permissions object
```

## 🔧 Setup Instructions

### 1. Database Setup
```bash
# Tables are already created via setup script
cd /var/www/main/luca
LUCA_DB_* node src/database/setup-teams.js
```

### 2. Server Restart
```bash
pm2 restart luca-costing-platform
```

### 3. Frontend Integration
```jsx
// Add to your main app component
import TeamManager from './luca/src/components/TeamManager';

// Use with existing auth token
<TeamManager authToken={jwtToken} />
```

## 🔒 Security Features

### Data Protection
- Users can only access teams they're explicitly added to
- Original data ownership never changes
- Team members cannot modify team structure (unless admin)
- All team actions are logged for audit

### Permission Validation
- Middleware checks permissions on every request
- Role-based access control enforced at API level
- Team access automatically expires if membership removed

### Invitation Security
- Secure random tokens for invitations
- 7-day expiration on invitations
- Email validation (integration with main app needed)

## 📈 Usage Examples

### Creating a Team
```javascript
// Owner creates team for their design agency
POST /api/teams/create
{
  "name": "Acme Design Agency",
  "description": "Shared workspace for client projects"
}
```

### Inviting Team Members
```javascript
// Owner invites freelancer with editor access
POST /api/teams/123/invite  
{
  "email": "freelancer@example.com",
  "role": "editor"
}
```

### Accessing Shared Data
```javascript
// Team member sees combined materials
GET /api/materials
// Returns:
[
  { id: 1, name: "Paint", access_type: "shared", user_id: 456 },
  { id: 2, name: "Canvas", access_type: "owner", user_id: 789 }
]
```

## 🚀 Next Steps

### Recommended Enhancements
1. **Email Integration**: Send actual invitation emails
2. **User Lookup**: Validate emails against main app users
3. **Bulk Invitations**: Invite multiple users at once
4. **Team Templates**: Pre-configured permission sets
5. **Usage Analytics**: Track team collaboration metrics

### Integration Points
- Main app user management for email validation
- Email service for invitation delivery
- Notification system for team activities
- Mobile app team management interface

## 🐛 Troubleshooting

### Common Issues
- **"Team not found"**: User not a member or team doesn't exist
- **"Insufficient permissions"**: User role doesn't allow the action
- **"Database connection failed"**: Check environment variables

### Debug Mode
```bash
# Check team membership
SELECT * FROM team_members WHERE user_id = ?;

# View team activity
SELECT * FROM team_activity_log WHERE team_id = ?;
```

## 📞 Support

The team system is fully integrated and ready to use! All existing Luca functionality now supports team collaboration while maintaining data security and user ownership.

For questions or issues, check the team activity logs and ensure proper JWT tokens are being passed from the main app.
