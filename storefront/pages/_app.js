import StorefrontLayout from '../components/sites-modules/StorefrontLayout';

export default function StorefrontApp({ Component, pageProps }) {
  const { initialSiteData, initialSubdomain, hasTemplateScript } = pageProps;

  if (!initialSiteData) {
    return <Component {...pageProps} />;
  }

  return (
    <StorefrontLayout
      siteData={initialSiteData}
      subdomain={initialSubdomain}
      hasTemplateScript={hasTemplateScript}
    >
      <Component {...pageProps} />
    </StorefrontLayout>
  );
}
