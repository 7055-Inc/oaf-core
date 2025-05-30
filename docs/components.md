# Component Documentation

## Pages

### Dashboard (`/pages/dashboard.js`)
The main dashboard component that serves as the landing page for authenticated users.

**Key Features:**
- User authentication check
- Role-based content display
- API key management link
- Admin access to user management

**State Management:**
- `isLoggedIn`: Tracks user authentication status
- `userData`: Stores current user information
- `error`: Handles error states

**Key Functions:**
- `useEffect`: Handles initial authentication check
- Role-based rendering of admin features

### Admin Dashboard (`/pages/dashboard/admin.js`)
Specialized dashboard for admin users with user management capabilities.

**Key Features:**
- User CRUD operations
- User status management
- User type management
- Admin-only access control

**State Management:**
- `isLoggedIn`: Authentication status
- `isAdmin`: Admin role verification
- `users`: List of all users
- `editingUser`: Currently edited user
- `newUser`: New user form data
- `showAddForm`: Add user form visibility
- `error`: Error handling

**Key Functions:**
- `fetchUserData`: Validates admin status
- `fetchUsers`: Retrieves user list
- `handleEditUser`: Manages user editing
- `handleSaveUser`: Saves user changes
- `handleDeleteUser`: Removes users
- `handleAddUser`: Creates new users

## Shared Components

### Header (`/components/Header.js`)
Common header component used across pages.

**Features:**
- Navigation
- User status display
- Consistent layout across pages

## Authentication Flow
1. Token validation on page load
2. Role verification for protected routes
3. Redirect handling for unauthorized access
4. Token management in localStorage

## API Integration
All components interact with the backend API at `api2.onlineartfestival.com`:

**Endpoints Used:**
- `/auth/exchange`: Token validation
- `/users/me`: Current user data
- `/admin/users`: User management
- `/api-keys`: API key management

## State Management
The application uses React's built-in state management:
- `useState` for local component state
- `useEffect` for side effects and data fetching
- `useRouter` for navigation

## Error Handling
- Consistent error state management
- User-friendly error messages
- Graceful fallbacks for failed operations 