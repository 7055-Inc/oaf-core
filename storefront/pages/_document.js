import Document, { Html, Head, Main, NextScript } from 'next/document';

class StorefrontDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com'} />
          <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com'} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default StorefrontDocument;
