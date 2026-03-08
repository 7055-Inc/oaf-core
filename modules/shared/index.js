/**
 * Shared module - reusable UI components used across dashboard and pages
 */

export { BlockEditor, BlockRenderer } from './block-editor';
export { default as AccordionSection } from './AccordionSection';
export { default as Breadcrumb } from './Breadcrumb';
export { default as CookieBanner, hasFullCookieConsent, hasCookieConsent } from './CookieBanner';

// Artist display components (used on product pages, homepage, profiles)
export { default as AboutTheArtist } from './AboutTheArtist';
export { default as ArtistCarousel } from './ArtistCarousel';
export { default as ArtistProductCarousel } from './ArtistProductCarousel';
export { default as ProfileDisplay } from './ProfileDisplay';
export { default as SocialLinks, extractSocialLinks } from './SocialLinks';
