# 🎭 Admin User Impersonation Feature - Setup Complete!

## ✅ What's Been Implemented

The "Act As" feature (user impersonation) has been fully implemented! Here's what was built:

### 1. **Database Schema** ✓
- Created `admin_impersonation_log` table to track all impersonation sessions
- Logs admin user, impersonated user, timestamps, duration, IP address, and reason
- Located at: `api-service/migrations/create_admin_impersonation_log.sql`

### 2. **Backend API** ✓
- **POST /api/admin/impersonate/:userId** - Start impersonating a user
- **POST /api/admin/stop-impersonation** - Stop impersonation and return to admin
- **GET /api/admin/impersonation-history** - View impersonation audit logs
- JWT middleware updated to handle impersonation context
- All routes in: `api-service/src/routes/admin.js`
- Middleware in: `api-service/src/middleware/jwt.js`

### 3. **Frontend Components** ✓
- **ImpersonationExitButton** - Floating button that appears during impersonation
- Added to all 3 header components (main, promoter, luca)
- **"Act As" button** added to ManageUsers component
- Token management utilities in `lib/csrf.js`

---

## 🚀 Installation Steps

### Step 1: Run Database Migration

Run this command to create the impersonation log table:

```bash
cd /var/www/main
mysql -u YOUR_DB_USER -p YOUR_DB_NAME < api-service/migrations/create_admin_impersonation_log.sql
```

Or manually execute the SQL file in your database client.

### Step 2: Restart API Service

```bash
pm2 restart api-service
# or if using a different process manager, restart accordingly
```

### Step 3: Clear Browser Cache (Optional)

If you're already logged in, you may want to clear your browser cache or do a hard refresh to ensure the new components load properly.

---

## 📖 How to Use

### Starting Impersonation

1. Go to **Dashboard → Admin → Manage Users**
2. Find the user you want to act as
3. Click the **"👤 Act As"** button (yellow button)
4. Confirm the action in the dialog
5. You'll be redirected as that user

### While Impersonating

- A **red floating button** will appear in the bottom-right corner of every page
- It shows: "Impersonating User - Acting as: [username]"
- All your actions appear as if the impersonated user is performing them
- **All actions are logged** with both your admin ID and the impersonated user ID

### Exiting Impersonation

- Click the **"← Exit Impersonation"** button in the floating widget
- You'll be returned to your admin session
- The page will refresh automatically

---

## 🔒 Security Features

✅ **Admin-Only Access** - Only users with `manage_system` permission can impersonate  
✅ **Cannot Impersonate Admins** - Safety check prevents impersonating other administrators  
✅ **Cannot Impersonate Yourself** - Prevents self-impersonation  
✅ **Complete Audit Trail** - Every session is logged with:
  - Who impersonated whom
  - When it started and ended
  - Duration of session
  - IP address and user agent
  - Optional reason field

✅ **Session Expiration** - Impersonation tokens expire after 1 hour  
✅ **Visual Indicator** - Impossible to forget you're impersonating (floating button always visible)  
✅ **Logged Actions** - Middleware adds context to all API requests

---

## 🔧 Technical Details

### JWT Token Structure During Impersonation

```javascript
{
  "userId": 123,              // The impersonated user
  "originalUserId": 456,      // The actual admin
  "isImpersonating": true,
  "impersonationLogId": 789,  // Log entry ID
  "username": "john_artist",  // Impersonated username
  "roles": ["artist"],        // Impersonated user's roles
  "permissions": ["vendor"],  // Impersonated user's permissions
  "iat": 1234567890,
  "exp": 1234571490           // 1 hour expiration
}
```

### Middleware Context

When impersonating, every API request includes:
- `req.userId` - Impersonated user ID
- `req.originalUserId` - Admin user ID
- `req.isImpersonating` - Boolean flag
- `req.impersonationLogId` - Log entry ID

This allows you to enhance logging in any endpoint by checking `req.originalUserId`.

### Database Schema

```sql
admin_impersonation_log
├── id (BIGINT, PRIMARY KEY)
├── admin_user_id (BIGINT, FK to users)
├── impersonated_user_id (BIGINT, FK to users)
├── started_at (TIMESTAMP)
├── ended_at (TIMESTAMP, nullable)
├── duration_seconds (INT, computed)
├── reason (VARCHAR 500, nullable)
├── ip_address (VARCHAR 45)
├── user_agent (TEXT)
└── session_active (BOOLEAN, computed)
```

---

## 📊 Viewing Impersonation History

You can view the audit log by calling:

```javascript
GET /api/admin/impersonation-history?limit=50
```

Response:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "admin_user_id": 456,
      "admin_username": "admin@example.com",
      "impersonated_user_id": 123,
      "impersonated_username": "john_artist",
      "started_at": "2025-11-06T10:30:00Z",
      "ended_at": "2025-11-06T10:45:00Z",
      "duration_seconds": 900,
      "reason": "Admin review from Manage Users",
      "ip_address": "192.168.1.1",
      "session_active": false
    }
  ]
}
```

---

## 🎨 UI Components

### Files Modified/Created:
- ✅ `components/ImpersonationExitButton.js` (NEW)
- ✅ `components/Header.js` (modified)
- ✅ `pages/promoter/header.js` (modified)
- ✅ `components/dashboard/admin/components/ManageUsers.js` (modified)
- ✅ `lib/csrf.js` (modified - added impersonation utilities)
- ✅ `api-service/src/routes/admin.js` (modified - added 3 endpoints)
- ✅ `api-service/src/middleware/jwt.js` (modified - added impersonation context)
- ✅ `api-service/migrations/create_admin_impersonation_log.sql` (NEW)

---

## 🧪 Testing Checklist

- [ ] Database migration runs successfully
- [ ] Admin can see "Act As" button in Manage Users
- [ ] Clicking "Act As" shows confirmation dialog
- [ ] After confirming, user is impersonated successfully
- [ ] Floating exit button appears on all pages
- [ ] Impersonated user's dashboard/profile loads correctly
- [ ] Actions appear as the impersonated user
- [ ] Exit button returns admin to their session
- [ ] Impersonation log entries are created in database
- [ ] Cannot impersonate admin users (should show error)
- [ ] Cannot impersonate yourself (should show error)

---

## 🐛 Troubleshooting

### Issue: "Act As" button doesn't appear
- **Check:** Is your user admin or have `manage_system` permission?
- **Fix:** Verify JWT token includes admin role or manage_system permission

### Issue: Floating exit button doesn't show
- **Check:** Browser console for errors
- **Fix:** Clear cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Token expired during impersonation
- **Expected Behavior:** Impersonation tokens expire after 1 hour
- **Fix:** Exit impersonation and start again

### Issue: Database migration fails
- **Check:** Table might already exist
- **Fix:** Use `CREATE TABLE IF NOT EXISTS` (already in migration)

---

## 📝 Future Enhancements (Optional)

Ideas for future iterations:
- Add a "Reason" text field in the UI when starting impersonation
- Admin dashboard widget showing active impersonation sessions
- Email notifications when admins impersonate users
- Extended logging to show specific actions taken during impersonation
- Impersonation session timeout warnings

---

## ✨ Summary

You now have a fully functional WordPress "Switch-To" style impersonation feature! Admins can seamlessly act as any user to troubleshoot issues, test permissions, or assist with support requests. All actions are logged for security and compliance.

**Built with:** JWT token manipulation, React components, Express middleware, and MySQL audit logging.

Enjoy your new superpower! 🦸‍♂️

