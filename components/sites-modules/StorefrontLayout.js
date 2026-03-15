import React from 'react';
import { useRouter } from 'next/router';
import { getSubdomainBase } from '../../lib/config';
import TemplateLoader from './TemplateLoader';
import StorefrontHeader from './StorefrontHeader';
import StorefrontFooter from './StorefrontFooter';

export default function StorefrontLayout({ siteData, subdomain, hasTemplateScript, children }) {
  if (!siteData) return <>{children}</>;

  const subdomainBase = getSubdomainBase();
  const siteUrl = siteData.custom_domain
    ? `https://${siteData.custom_domain}`
    : `https://${subdomain}.${subdomainBase}`;

  const templateCustomizations = {
    primary_color: siteData.primary_color,
    secondary_color: siteData.secondary_color,
    text_color: siteData.text_color,
    accent_color: siteData.accent_color,
    background_color: siteData.background_color,
    body_font: siteData.body_font,
    header_font: siteData.header_font,
    button_color: siteData.button_color,
    border_radius: siteData.border_radius,
    spacing_scale: siteData.spacing_scale,
  };

  const templateData = siteData.template_data || {};

  const dataAttrs = {};
  Object.entries(templateData).forEach(([key, value]) => {
    if (value) dataAttrs[`data-${key.replace(/_/g, '-')}`] = value;
  });
  if (siteData.show_prices) dataAttrs['data-show-prices'] = siteData.show_prices;

  const customStyles = {
    '--text-color': siteData.text_color,
    '--main-color': siteData.primary_color,
    '--secondary-color': siteData.secondary_color,
    '--accent-color': siteData.accent_color,
    '--background-color': siteData.background_color,
  };

  return (
    <>
      <TemplateLoader
        templateSlug={siteData.template_slug || 'classic-gallery'}
        customizations={templateCustomizations}
        templateData={templateData}
        customCSS={siteData.custom_css}
        hasScript={hasTemplateScript}
      />

      <div className="storefront" style={customStyles} {...dataAttrs}>
        <StorefrontHeader siteData={siteData} siteUrl={siteUrl} subdomain={subdomain} />
        {children}
        <StorefrontFooter siteData={siteData} />
      </div>
    </>
  );
}
