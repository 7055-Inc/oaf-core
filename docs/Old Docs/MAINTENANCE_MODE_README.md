# Maintenance Mode System

## Overview

The Online Art Festival platform includes a comprehensive maintenance mode system that allows administrators to temporarily lock down the site for maintenance, updates, or emergency situations while providing a professional maintenance page to visitors.

## Features

### 🔒 **System-Wide Lock-Out**
- Complete site lockdown with professional maintenance page
- Admin bypass capability for continued access during maintenance
- Configurable user bypass list for developers and testers
- Automatic redirect to maintenance page for all non-admin users

### 🎨 **Professional Maintenance Page**
- Beautiful, responsive design with art-themed elements
- Customizable title, message, and contact information
- Optional progress bar for long maintenance windows
- Estimated completion time display with countdown
- Auto-refresh functionality to check for site restoration
- SEO-friendly with proper meta tags and no-index directives

### ⚙️ **Flexible Configuration**
- Environment variable control for permanent settings
- File-based emergency activation for quick deployment
- Database integration ready for dynamic admin control
- Configurable bypass user lists
- Real-time configuration updates through admin interface

### 🛡️ **Admin Controls**
- Dedicated admin interface for maintenance management
- Real-time status monitoring and control
- Configuration preview and testing
- Activity logging and audit trail
- Quick enable/disable toggles

## Configuration Methods

### 1. Environment Variables (Recommended for Production)

Add to your `.env` file:

```bash
# Enable/disable maintenance mode
MAINTENANCE_MODE=true

# Users who can bypass maintenance (comma-separated usernames)
# Note: Admins can always bypass
MAINTENANCE_BYPASS_USERS=developer,tester,support
```

### 2. File-Based Control (Emergency Use)

Create a `.maintenance` file in the project root:

```json
{
  "enabled": true,
  "enabledAt": "2024-01-15T10:30:00.000Z",
  "enabledBy": "admin_user_id",
  "config": {
    "title": "Emergency Maintenance",
    "message": "We're addressing a critical issue and will be back online shortly.",
    "estimatedTime": "2024-01-15T12:00:00.000Z",
    "contactEmail": "support@beemeeart.com",
    "showProgress": false,
    "bypassUsers": ["emergency_admin"]
  }
}
```

### 3. Admin Interface Control

Access the maintenance control panel at:
- **Main Site**: `/dashboard` → Admin Tools → Maintenance Control
- **Direct API**: `/api/admin/maintenance/`

## API Endpoints

### Get Status
```http
GET /api/admin/maintenance/status
Authorization: Bearer <admin_token>
```

### Enable Maintenance
```http
POST /api/admin/maintenance/enable
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "We'll Be Right Back!",
  "message": "Scheduled maintenance in progress...",
  "estimatedTime": "2024-01-15T14:00:00.000Z",
  "contactEmail": "support@beemeeart.com",
  "showProgress": true,
  "bypassUsers": "developer,tester"
}
```

### Disable Maintenance
```http
POST /api/admin/maintenance/disable
Authorization: Bearer <admin_token>
```

## Usage Scenarios

### 1. Scheduled Maintenance
```bash
# 1. Set environment variable
MAINTENANCE_MODE=true

# 2. Configure through admin interface
# - Set estimated completion time
# - Enable progress bar
# - Add custom message about the maintenance

# 3. Restart application to apply changes
pm2 restart oaf-api
```

### 2. Emergency Lockdown
```bash
# Quick file-based activation (no restart required)
echo '{"enabled":true,"enabledAt":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","reason":"Emergency maintenance"}' > .maintenance
```

### 3. Planned Deployment
```bash
# 1. Enable maintenance mode
curl -X POST http://localhost:3001/api/admin/maintenance/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Update in Progress",
    "message": "We are deploying new features and improvements.",
    "estimatedTime": "'$(date -d '+2 hours' -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "showProgress": true
  }'

# 2. Perform deployment
# ... your deployment steps ...

# 3. Disable maintenance mode
curl -X POST http://localhost:3001/api/admin/maintenance/disable \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Security Features

### 🔐 **Access Control**
- Only users with `manage_system` permission can control maintenance mode
- Admin users (`user_type = 'admin'`) automatically bypass maintenance
- Configurable bypass list for specific users
- Token-based authentication for all control operations

### 🛡️ **Protection Mechanisms**
- Middleware-level enforcement (cannot be bypassed by direct URL access)
- Static assets and critical API endpoints remain accessible
- CSRF protection on all admin control endpoints
- Rate limiting on maintenance control operations

### 📝 **Audit Trail**
- All maintenance mode changes are logged
- User ID tracking for enable/disable operations
- Timestamp recording for all configuration changes
- Activity logs accessible through admin interface

## Technical Implementation

### Middleware Chain
```
Request → Maintenance Check → Route Handler
    ↓           ↓                 ↓
  Bypass?   Redirect to      Normal
  (Admin)   /maintenance     Response
```

### File Structure
```
/middleware/maintenanceMode.js    # Core maintenance logic
/pages/maintenance.js             # Maintenance page component
/styles/Maintenance.module.css    # Maintenance page styles
/api-service/routes/admin/maintenance.js  # Admin API endpoints
/components/dashboard/admin/components/MaintenanceControl.js  # Admin UI
```

### Database Integration (Future Enhancement)
```sql
-- Planned table for database-driven maintenance control
CREATE TABLE system_maintenance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  is_active BOOLEAN DEFAULT FALSE,
  title VARCHAR(255),
  message TEXT,
  estimated_completion TIMESTAMP NULL,
  contact_email VARCHAR(255),
  show_progress BOOLEAN DEFAULT FALSE,
  bypass_users JSON,
  enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  enabled_by BIGINT,
  disabled_at TIMESTAMP NULL,
  disabled_by BIGINT NULL,
  FOREIGN KEY (enabled_by) REFERENCES users(id),
  FOREIGN KEY (disabled_by) REFERENCES users(id)
);
```

## Best Practices

### 🎯 **Planning**
1. **Schedule maintenance during low-traffic periods**
2. **Communicate maintenance windows in advance**
3. **Set realistic estimated completion times**
4. **Test maintenance page appearance before activation**

### ⚡ **Execution**
1. **Enable maintenance mode before starting work**
2. **Monitor bypass user access during maintenance**
3. **Update progress and estimated times if delays occur**
4. **Verify site functionality before disabling maintenance**

### 📊 **Monitoring**
1. **Check maintenance logs regularly**
2. **Monitor server resources during maintenance**
3. **Verify maintenance page accessibility**
4. **Test admin bypass functionality periodically**

## Troubleshooting

### Common Issues

#### Maintenance Mode Won't Enable
```bash
# Check file permissions
ls -la .maintenance

# Check environment variables
echo $MAINTENANCE_MODE

# Check admin permissions
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/verify
```

#### Can't Access Admin Interface During Maintenance
```bash
# Verify admin user type
SELECT user_type FROM users WHERE id = YOUR_USER_ID;

# Check bypass user list
cat .maintenance | jq '.config.bypassUsers'

# Verify token validity
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/verify
```

#### Maintenance Page Not Displaying
```bash
# Check middleware registration
grep -r "maintenanceMode" middleware/

# Verify route configuration
curl -I http://localhost:3000/maintenance

# Check for JavaScript errors in browser console
```

### Emergency Recovery

#### Force Disable Maintenance Mode
```bash
# Remove maintenance file
rm -f .maintenance

# Unset environment variable
unset MAINTENANCE_MODE

# Restart application
pm2 restart all
```

#### Bypass Maintenance for Emergency Access
```bash
# Add emergency user to bypass list
echo '{"enabled":true,"config":{"bypassUsers":["emergency_admin"]}}' > .maintenance

# Or temporarily set environment variable
export MAINTENANCE_BYPASS_USERS="emergency_admin"
```

## Integration with Existing Systems

### 🔄 **CI/CD Integration**
```yaml
# Example GitHub Actions workflow
- name: Enable Maintenance Mode
  run: |
    curl -X POST $API_URL/api/admin/maintenance/enable \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"title":"Deployment in Progress"}'

- name: Deploy Application
  run: # ... deployment steps ...

- name: Disable Maintenance Mode
  run: |
    curl -X POST $API_URL/api/admin/maintenance/disable \
      -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 📊 **Monitoring Integration**
```bash
# Health check endpoint that respects maintenance mode
curl http://localhost:3001/api/health

# Maintenance status for monitoring systems
curl http://localhost:3001/api/admin/maintenance/status
```

### 🔔 **Notification Integration**
```javascript
// Example: Send notifications when maintenance is enabled
const notifyMaintenanceEnabled = async (config) => {
  await sendSlackNotification(`🚧 Maintenance mode enabled: ${config.title}`);
  await sendEmailToAdmins('Maintenance Mode Activated', config);
};
```

## Future Enhancements

### 🚀 **Planned Features**
- [ ] **Scheduled Maintenance**: Automatic enable/disable based on cron schedules
- [ ] **Progressive Maintenance**: Gradual user lockout for smooth transitions
- [ ] **Multi-Language Support**: Maintenance page in multiple languages
- [ ] **Custom Themes**: Branded maintenance pages for different events
- [ ] **Real-Time Updates**: WebSocket-based progress updates
- [ ] **Mobile App Integration**: Push notifications for maintenance windows

### 🔧 **Technical Improvements**
- [ ] **Database Storage**: Move configuration from files to database
- [ ] **Redis Integration**: Distributed maintenance state for load balancers
- [ ] **Metrics Collection**: Detailed analytics on maintenance impact
- [ ] **A/B Testing**: Different maintenance page variants
- [ ] **API Rate Limiting**: Smarter rate limiting during maintenance

---

## Quick Reference

### Enable Maintenance (Environment)
```bash
export MAINTENANCE_MODE=true
pm2 restart oaf-api
```

### Enable Maintenance (File)
```bash
echo '{"enabled":true}' > .maintenance
```

### Enable Maintenance (API)
```bash
curl -X POST localhost:3001/api/admin/maintenance/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Maintenance in Progress"}'
```

### Disable Maintenance
```bash
rm -f .maintenance
unset MAINTENANCE_MODE
curl -X POST localhost:3001/api/admin/maintenance/disable \
  -H "Authorization: Bearer $TOKEN"
```

### Check Status
```bash
curl localhost:3001/api/admin/maintenance/status \
  -H "Authorization: Bearer $TOKEN"
```

---

*This maintenance system provides enterprise-grade reliability and flexibility for managing site availability during updates, maintenance, and emergency situations.*
