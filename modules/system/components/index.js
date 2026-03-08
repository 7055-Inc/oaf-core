/**
 * System Module Components
 */

// Homepage management (combined hero + announcements)
export { default as Homepage } from './homepage/Homepage';
export { default as HeroSettings } from './homepage/HeroSettings';
export { default as Announcements } from './homepage/Announcements';

// Email management
export { EmailCore } from './email';
export { OverviewTab as EmailOverview } from './email';
export { TemplatesTab as EmailTemplates } from './email';
export { LogsTab as EmailLogs } from './email';
export { QueueTab as EmailQueue } from './email';
export { BouncesTab as EmailBounces } from './email';

// Terms & Conditions management
export { TermsCore } from './terms';
