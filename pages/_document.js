import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Favicon and App Icons */}
          <link rel="icon" href="/static_media/brakebee-logo.png" />
          <link rel="apple-touch-icon" href="/static_media/brakebee-logo.png" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#055474" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Brakebee" />
          
          {/* DNS Prefetch and Preconnect for faster loading */}
          {/* API - 300ms savings per PageSpeed */}
          <link rel="preconnect" href="https://api.brakebee.com" />
          <link rel="dns-prefetch" href="https://api.brakebee.com" />
          
          {/* Fonts */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
          <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
          
          {/* CDN */}
          <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
          <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
          
          {/* Third-party services */}
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
          <link rel="dns-prefetch" href="https://diffuser-cdn.app-us1.com" />
          
          {/* 
            OPTIMIZED FONT LOADING
            - preconnect eliminates DNS/TCP/TLS latency
            - display=swap shows fallback font immediately, swaps when loaded
            - Single consolidated request for all Google Fonts
          */}
          
          {/* 
            Google Fonts - Non-blocking load via JavaScript
            This injects the stylesheets after the page loads, eliminating render-blocking
          */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  var fonts = [
                    'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Covered+By+Your+Grace&family=Permanent+Marker&family=Nunito+Sans:wght@300;400;500;600;700&family=Montserrat:wght@300;400;600;700&display=swap',
                    'https://fonts.googleapis.com/icon?family=Material+Icons&display=swap'
                  ];
                  fonts.forEach(function(href) {
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = href;
                    document.head.appendChild(link);
                  });
                })();
              `,
            }}
          />
          {/* Fallback for no-JS */}
          <noscript>
            <link
              href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Covered+By+Your+Grace&family=Permanent+Marker&family=Nunito+Sans:wght@300;400;500;600;700&family=Montserrat:wght@300;400;600;700&display=swap"
              rel="stylesheet"
            />
          <link
              href="https://fonts.googleapis.com/icon?family=Material+Icons&display=swap"
            rel="stylesheet"
          />
          </noscript>
          
          {/* Font Awesome - Preload then apply (non-blocking) */}
          <link
            rel="preload"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
            as="style"
            integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
            crossOrigin="anonymous"
          />
          <link
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
            integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            rel="stylesheet"
          />

        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P2CLNXVS');`,
          }}
        />
        {/* End Google Tag Manager */}

        </Head>
        <body>
        {/* Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P2CLNXVS"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }}
        />
        {/* End Google Tag Manager (noscript) */}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;