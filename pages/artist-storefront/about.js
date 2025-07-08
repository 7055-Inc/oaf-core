import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from './ArtistStorefront.module.css';

const ArtistAbout = () => {
  const router = useRouter();
  const { subdomain, userId, siteName } = router.query;
  
  const [siteData, setSiteData] = useState(null);
  const [aboutArticle, setAboutArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (subdomain) {
      fetchAboutData();
    }
  }, [subdomain]);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      
      // Fetch site data and about article
      const [siteResponse, articlesResponse] = await Promise.all([
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}`),
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}/articles?type=pages`)
      ]);

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        setSiteData(siteData);
      }

      if (articlesResponse.ok) {
        const articlesData = await articlesResponse.json();
        // Look for an about page
        const aboutPage = articlesData.find(article => 
          article.page_type === 'about' || 
          article.slug.includes('about') ||
          article.title.toLowerCase().includes('about')
        );
        setAboutArticle(aboutPage);
      }

    } catch (err) {
      setError('Failed to load about page');
      console.error('Error fetching about data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading about page...</p>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className={styles.error}>
        <h1>Page Not Found</h1>
        <p>Sorry, this page is not available.</p>
        <Link href={`https://${subdomain}.onlineartfestival.com`}>
          <a className={styles.homeLink}>← Back to Gallery</a>
        </Link>
      </div>
    );
  }

  const pageTitle = `About ${siteData.first_name} ${siteData.last_name} - Artist`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={siteData.bio || `Learn more about artist ${siteData.first_name} ${siteData.last_name}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.storefront}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.artistInfo}>
              {siteData.profile_image_path && (
                <img 
                  src={`https://api2.onlineartfestival.com${siteData.profile_image_path}`}
                  alt={`${siteData.first_name} ${siteData.last_name}`}
                  className={styles.artistAvatar}
                />
              )}
              <div className={styles.artistDetails}>
                <Link href={`https://${subdomain}.onlineartfestival.com`}>
                  <a className={styles.artistName}>
                    {siteData.first_name} {siteData.last_name}
                  </a>
                </Link>
                <p className={styles.artistTitle}>Artist</p>
              </div>
            </div>

            <nav className={styles.navigation}>
              <Link href={`https://${subdomain}.onlineartfestival.com`}>
                <a className={styles.navLink}>Gallery</a>
              </Link>
              <Link href={`https://${subdomain}.onlineartfestival.com/about`}>
                <a className={`${styles.navLink} ${styles.active}`}>About</a>
              </Link>
              <Link href="https://main.onlineartfestival.com">
                <a className={styles.navLink}>Main Site</a>
              </Link>
            </nav>
          </div>
        </header>

        {/* About Content */}
        <main className={styles.aboutMain}>
          <div className={styles.container}>
            
            {/* Artist Profile Section */}
            <section className={styles.artistProfile}>
              <div className={styles.profileGrid}>
                <div className={styles.profileImage}>
                  {siteData.profile_image_path ? (
                    <img 
                      src={`https://api2.onlineartfestival.com${siteData.profile_image_path}`}
                      alt={`${siteData.first_name} ${siteData.last_name}`}
                    />
                  ) : (
                    <div className={styles.profilePlaceholder}>
                      <span>{siteData.first_name?.[0]}{siteData.last_name?.[0]}</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.profileContent}>
                  <h1 className={styles.aboutTitle}>About {siteData.first_name} {siteData.last_name}</h1>
                  
                  {siteData.bio && (
                    <div className={styles.artistBio}>
                      <p>{siteData.bio}</p>
                    </div>
                  )}

                  {siteData.artist_biography && (
                    <div className={styles.artistBiography}>
                      <h3>Artist Statement</h3>
                      <div dangerouslySetInnerHTML={{ __html: siteData.artist_biography }} />
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className={styles.contactInfo}>
                    <h3>Connect</h3>
                    <div className={styles.contactLinks}>
                      {siteData.website && (
                        <a href={siteData.website} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                          🌐 Website
                        </a>
                      )}
                      {siteData.social_instagram && (
                        <a href={siteData.social_instagram} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                          📷 Instagram
                        </a>
                      )}
                      {siteData.social_facebook && (
                        <a href={siteData.social_facebook} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                          📘 Facebook
                        </a>
                      )}
                      {siteData.social_twitter && (
                        <a href={siteData.social_twitter} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                          🐦 Twitter
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Custom About Article Content */}
            {aboutArticle && (
              <section className={styles.aboutArticle}>
                <div className={styles.articleContent}>
                  <h2>{aboutArticle.title}</h2>
                  <div 
                    className={styles.articleBody}
                    dangerouslySetInnerHTML={{ __html: aboutArticle.content }}
                  />
                </div>
              </section>
            )}

            {/* Artist Details Grid */}
            <section className={styles.artistDetails}>
              <div className={styles.detailsGrid}>
                
                {siteData.art_categories && (
                  <div className={styles.detailCard}>
                    <h3>Art Categories</h3>
                    <p>{siteData.art_categories}</p>
                  </div>
                )}

                {siteData.does_custom === 'yes' && (
                  <div className={styles.detailCard}>
                    <h3>Custom Work</h3>
                    <p>✅ Available for custom commissions</p>
                    {siteData.custom_details && (
                      <p className={styles.customDetails}>{siteData.custom_details}</p>
                    )}
                  </div>
                )}

                {siteData.business_name && (
                  <div className={styles.detailCard}>
                    <h3>Studio</h3>
                    <p><strong>{siteData.business_name}</strong></p>
                    {siteData.studio_address_line1 && (
                      <div className={styles.studioAddress}>
                        <p>{siteData.studio_address_line1}</p>
                        {siteData.studio_address_line2 && <p>{siteData.studio_address_line2}</p>}
                      </div>
                    )}
                  </div>
                )}

                {siteData.business_website && (
                  <div className={styles.detailCard}>
                    <h3>Studio Website</h3>
                    <a href={siteData.business_website} target="_blank" rel="noopener noreferrer">
                      Visit Studio Site
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Call to Action */}
            <section className={styles.callToAction}>
              <div className={styles.ctaCard}>
                <h2>Interested in my work?</h2>
                <p>Browse my gallery or get in touch to discuss custom pieces</p>
                <div className={styles.ctaButtons}>
                  <Link href={`https://${subdomain}.onlineartfestival.com`}>
                    <a className={styles.ctaPrimary}>View Gallery</a>
                  </Link>
                  <Link href={`https://${subdomain}.onlineartfestival.com/contact`}>
                    <a className={styles.ctaSecondary}>Contact Me</a>
                  </Link>
                </div>
              </div>
            </section>

          </div>
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.container}>
            <div className={styles.footerContent}>
              <div className={styles.footerSection}>
                <h4>{siteData.first_name} {siteData.last_name}</h4>
                <p>Artist Gallery</p>
              </div>
              
              <div className={styles.footerSection}>
                <h4>Platform</h4>
                <p>
                  <Link href="https://main.onlineartfestival.com">
                    <a>Online Art Festival</a>
                  </Link>
                </p>
                <p className={styles.poweredBy}>Powered by OAF</p>
              </div>
            </div>
            
            <div className={styles.footerBottom}>
              <p>&copy; 2025 {siteData.first_name} {siteData.last_name}. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ArtistAbout; 