# User Authentication & Management

This module provides a complete Firebase Authentication system for the Online Art Festival application. It includes functionality for both social provider authentication (Google, Facebook, Twitter, GitHub) and email/password authentication.

## Files Overview

- `users.js` - The main entry point that provides the authentication context and state management
- `auth_get_providers.js` - Configures authentication providers (Google, Facebook, Twitter, GitHub)
- `login.js` - The login component with both social and email/password authentication
- `login.css` - Styling for the login component

## Setup & Usage

### 1. Wrap your app with the `UserProvider`

In your main App component, import and use the `UserProvider` to give your entire application access to authentication state:

```jsx
import { UserProvider } from './users/users';

function App() {
  return (
    <UserProvider>
      {/* Your app components */}
    </UserProvider>
  );
}
```

### 2. Access user state anywhere in your application

Use the `useUser` hook to access authentication state from any component:

```jsx
import { useUser } from './users/users';

function MyComponent() {
  const { currentUser, loading } = useUser();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (currentUser) {
    return <div>Hello, {currentUser.displayName || currentUser.email}</div>;
  }
  
  return <div>Please sign in</div>;
}
```

### 3. Manual sign-in with popup

If you need to trigger authentication from a custom button outside the Login component:

```jsx
import { signInWithPopup } from 'firebase/auth';
import { auth } from './users/users';
import { googleProvider } from './users/auth_get_providers';

function SignInButton() {
  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      console.log('Signed in user:', user);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };
  
  return (
    <button onClick={handleSignIn}>
      Sign in with Google
    </button>
  );
}
```

## Authentication Flow

1. User clicks a login provider button (Google, email/password, etc.)
2. Firebase Authentication handles the authentication flow
3. On successful authentication, the `onAuthStateChanged` listener in `UserProvider` updates the context with the user information
4. Components using the `useUser` hook receive the updated user state

## User Data Structure

After authentication, the `currentUser` object contains:

- `uid` - Unique identifier for the user
- `email` - User's email address
- `displayName` - User's display name (if available)
- `photoURL` - URL to user's profile photo (if available)
- `emailVerified` - Boolean indicating if email is verified
- Additional provider-specific data

## Tips & Best Practices

1. **Handle loading states**: Always check the `loading` state before making decisions based on user authentication to avoid flashing incorrect UI.

2. **Error handling**: Wrap authentication calls in try/catch blocks and display user-friendly error messages.

3. **Persistence**: Firebase Auth uses local storage by default. To change this behavior:
   ```javascript
   import { setPersistence, browserSessionPersistence } from 'firebase/auth';
   setPersistence(auth, browserSessionPersistence);
   ```

4. **Security rules**: Make sure to set up proper Firebase Security Rules to protect your data based on authentication.

5. **Token refreshes**: Firebase automatically refreshes tokens. No manual management is needed.

6. **Customization**: The login component can be customized by modifying the CSS or component structure.

7. **API integration**: After authentication, send the Firebase ID token to your backend:
   ```javascript
   const token = await currentUser.getIdToken();
   // Send to your backend API
   fetch('/api/auth', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

## Troubleshooting

- **Popup blocked**: If sign-in popups are blocked, ensure they're triggered by a direct user action (like a button click).

- **Authentication persistence**: If users are being signed out unexpectedly, check your persistence settings.

- **CORS issues**: For social providers, ensure your Firebase project has the correct OAuth redirect domains configured.

- **Custom domains**: If using a custom domain, configure it in the Firebase Console's Authentication settings.

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [FirebaseUI Web Documentation](https://github.com/firebase/firebaseui-web)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks) 