/**
 * Users Module Components
 * User management, profiles, personas, verification
 */
export { default as PersonaList } from './PersonaList';
export { default as PersonaForm } from './PersonaForm';
export { default as EmailPreferences } from './EmailPreferences';
export { default as PaymentSettings } from './PaymentSettings';
export { default as ShippingSettings } from './ShippingSettings';
export { default as VerificationHub } from './VerificationHub';

// Profile Form (accordion-based editor)
export { default as ProfileForm } from './profile-form';

// Verified Artist Subscription
export {
  VerifiedSubscription,
  VerifiedDashboard,
  verifiedConfig
} from './verified';

// Admin components (visible only to admins)
export { default as UserManagement } from './UserManagement';
export { default as PersonaManagement } from './PersonaManagement';
export { default as ImpersonationExitButton } from './ImpersonationExitButton';
export { default as CommissionManagement } from './CommissionManagement';