/** @type {import('next-sitemap').IConfig} */

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://brakebee.com';
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com';

module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  
  // Exclude dashboard and internal pages from sitemap
  exclude: [
    '/dashboard/*',
    '/dashboard',
    '/api/*',
    '/api-keys',
    '/logout',
    '/profile-completion',
    '/terms-acceptance',
    '/announcement-acknowledgment',
    '/custom-sites/*',
    '/checkout/*',
    '/cart/*',
    '/event-payment/*',
    '/vendor/*',
    '/promoters/*',
  ],
  
  // robots.txt configuration
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/api/',
          '/checkout/',
          '/cart/',
          '/profile-completion',
          '/terms-acceptance',
        ],
      },
    ],
    // All dynamic content is in the main sitemap (sitemap-0.xml)
  },
  
  // Generate additional sitemaps for dynamic content
  additionalPaths: async (config) => {
    const paths = [];
    
    try {
      // Fetch events
      const eventsRes = await fetch(`${API_URL}/api/events/upcoming?limit=500`);
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        events.forEach(event => {
          paths.push({
            loc: `/events/${event.id}`,
            lastmod: event.updated_at || new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.8,
          });
        });
      }
    } catch (err) {
      console.log('Could not fetch events for sitemap:', err.message);
    }
    
    try {
      // Fetch artists/profiles
      const artistsRes = await fetch(`${API_URL}/users/artists?limit=500`);
      if (artistsRes.ok) {
        const artists = await artistsRes.json();
        artists.forEach(artist => {
          paths.push({
            loc: `/profile/${artist.id}`,
            lastmod: artist.updated_at || new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.7,
          });
        });
      }
    } catch (err) {
      console.log('Could not fetch artists for sitemap:', err.message);
    }
    
    try {
      // Fetch articles
      const articlesRes = await fetch(`${API_URL}/api/articles?limit=500&status=published`);
      if (articlesRes.ok) {
        const data = await articlesRes.json();
        const articles = data.articles || data;
        if (Array.isArray(articles)) {
          articles.forEach(article => {
            paths.push({
              loc: `/articles/${article.slug}`,
              lastmod: article.updated_at || new Date().toISOString(),
              changefreq: 'monthly',
              priority: 0.6,
            });
          });
        }
      }
    } catch (err) {
      console.log('Could not fetch articles for sitemap:', err.message);
    }
    
    try {
      // Fetch categories
      const categoriesRes = await fetch(`${API_URL}/categories`);
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        const categories = data.categories || data.flat_categories || [];
        categories.forEach(category => {
          paths.push({
            loc: `/category/${category.id}`,
            lastmod: new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.7,
          });
        });
      }
    } catch (err) {
      console.log('Could not fetch categories for sitemap:', err.message);
    }
    
    try {
      // Fetch products
      const productsRes = await fetch(`${API_URL}/products/all?limit=1000&status=active`);
      if (productsRes.ok) {
        const data = await productsRes.json();
        const products = data.products || data;
        if (Array.isArray(products)) {
          products.forEach(product => {
            paths.push({
              loc: `/products/${product.id}`,
              lastmod: product.updated_at || new Date().toISOString(),
              changefreq: 'weekly',
              priority: 0.8,
            });
          });
        }
      }
    } catch (err) {
      console.log('Could not fetch products for sitemap:', err.message);
    }
    
    return paths;
  },
};

