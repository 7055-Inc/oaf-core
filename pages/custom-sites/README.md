# Custom Subdomain Pages

This directory contains custom pages for specific subdomains that need special handling instead of the default artist storefront.

## How to Add a Custom Subdomain Page

### 1. Create the Custom Page

Create a new file in this directory: `pages/custom-sites/yoursubdomain.js`

Example structure:
```javascript
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from './yoursubdomain.module.css';

const YourSubdomainPage = () => {
  const router = useRouter();
  const { subdomain } = router.query;

  return (
    <>
      <Head>
        <title>Your Page Title</title>
        <meta name="description" content="Your page description" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        {/* Your custom content here */}
      </div>
    </>
  );
};

export default YourSubdomainPage;
```

### 2. Add CSS Module (Optional)

Create `pages/custom-sites/yoursubdomain.module.css`:
```css
.container {
  min-height: 100vh;
  /* Your styles here */
}
```

### 3. Update the Subdomain Router

In `middleware/subdomainRouter.js`, add your subdomain to the custom routing section:

```javascript
// Handle custom subdomains with special routing
if (subdomain === 'signup') {
  return NextResponse.rewrite(new URL(`/custom-sites/signup?subdomain=${subdomain}`, req.url));
}

// Add your new subdomain here:
if (subdomain === 'yoursubdomain') {
  return NextResponse.rewrite(new URL(`/custom-sites/yoursubdomain?subdomain=${subdomain}`, req.url));
}
```

### 4. Reserve the Subdomain

In `api-service/src/routes/sites.js`, add your subdomain to the reserved list:

```javascript
const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store', 'signup', 'yoursubdomain'];
```

### 5. Build and Test

Run `npm run build` to apply your changes.

## Current Custom Pages

- **signup.onlineartfestival.com** - Email verification redirect page
  - File: `pages/custom-sites/signup.js`
  - Purpose: Redirects users to main site after email verification

## Use Cases for Custom Pages

- **Landing pages** for marketing campaigns
- **Redirect pages** for email verification
- **Special event pages** with unique branding
- **API documentation** or developer portals
- **Partner-specific** pages or microsites

## Notes

- Custom pages bypass the artist storefront system entirely
- They don't require a database entry in the `sites` table
- They can have completely different designs and functionality
- They're perfect for one-off pages or special purposes 