import { useState } from 'react';
import Head from 'next/head';
import MakersHeader from './header';
import MakersFooter from './footer';
import styles from './styles.module.css';

export default function MakersFeatures() {
  const [activeFeature, setActiveFeature] = useState('marketplace');

  // Brakebee brand colors
  const primaryColor = '#055474';
  const secondaryColor = '#3E1C56';

  const handleStartSelling = () => {
    window.location.href = '/signup';
  };

  const features = {
    marketplace: {
      title: 'Curated Marketplace',
      icon: 'fa-store',
      description: 'Your work showcased alongside verified artists in a quality-focused marketplace.',
      benefits: [
        'Exposure to art collectors actively looking to buy',
        'Curated discovery — not lost in a sea of random products',
        'Professional product pages with zoom, multiple images',
        'Built-in reviews and artist ratings',
        'Category and style-based browsing for buyers',
        'Featured artist spotlights and collections'
      ]
    },
    storefront: {
      title: 'Personal Storefront',
      icon: 'fa-globe',
      description: 'Your own branded online store — use a Brakebee subdomain or bring your own custom domain.',
      benefits: [
        'Bring your own domain for a full branded website',
        'Personalized bio, profile photo, and banner',
        'Showcase your complete catalog in one place',
        'Custom About page to tell your story',
        'Share your unique link on social media'
      ]
    },
    events: {
      title: 'Event Integration',
      icon: 'fa-calendar-check',
      description: 'Apply to art fairs and sell in-person with integrated tools.',
      benefits: [
        'Browse and apply to events on the platform',
        'Manage booth applications in one dashboard',
        'Mobile POS for in-person sales',
        'Track event inventory separately',
        'Accept cards, cash, and digital payments',
        'Event-specific analytics and reports'
      ]
    },
    ai: {
      title: 'AI-Powered Tools',
      icon: 'fa-robot',
      description: 'Leo Art AI helps you work smarter, not harder.',
      benefits: [
        'Auto-generate compelling product descriptions',
        'Smart pricing suggestions based on market data',
        'Automated customer inquiry responses',
        'SEO optimization for better discovery',
        'Inventory recommendations and alerts',
        'Sales insights and trend analysis'
      ]
    },
    shipping: {
      title: 'Shipping Made Easy',
      icon: 'fa-truck-fast',
      description: 'Integrated shipping tools with discounted rates for all artists.',
      benefits: [
        'Print discounted shipping labels directly from orders',
        'All artists get access to discounted 1-off label rates',
        'Real-time calculated shipping rates',
        'Automatic tracking updates to buyers',
        'Support for USPS, UPS, FedEx',
        'Insurance options for valuable pieces'
      ]
    },
    payments: {
      title: 'Flexible Pricing',
      icon: 'fa-hand-holding-dollar',
      description: 'Start free, pay only when you sell, and add features as you grow.',
      benefits: [
        'Core platform is 100% free to start',
        '15% flat fee only when you make a sale',
        'Optional subscriptions to unlock more features',
        'Secure Stripe payment processing',
        'Clear transaction history and reports'
      ]
    }
  };

  return (
    <>
      <Head>
        <title>Features for Artists | Brakebee Makers</title>
        <meta name="description" content="Explore all the features Brakebee offers artists and makers: marketplace, personal storefronts, event sales, AI tools, shipping integration, and fast payments." />
        <link rel="canonical" href="https://brakebee.com/makers/features" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <MakersHeader />

        <main style={{ flex: 1 }}>
          {/* Hero Section */}
          <section style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            padding: '4rem 0 5rem',
            textAlign: 'center'
          }}>
            <div style={{
              maxWidth: '900px',
              margin: '0 auto',
              padding: '0 2rem'
            }}>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                fontWeight: 'bold',
                color: primaryColor,
                marginBottom: '1.5rem',
                fontFamily: "'Permanent Marker', cursive"
              }}>
                Everything You Need to Sell Your Art
              </h1>
              <p style={{
                fontSize: '1.25rem',
                color: '#666',
                lineHeight: 1.6,
                marginBottom: '2rem',
                fontFamily: "'Nunito Sans', sans-serif"
              }}>
                From listing your first product to shipping your hundredth order, Brakebee has the tools to help you grow your creative business.
              </p>
              <button
                onClick={handleStartSelling}
                className={styles.ctaButton}
              >
                Start Selling Free
              </button>
            </div>
          </section>

          {/* Feature Navigation */}
          <section style={{
            background: '#fff',
            borderBottom: '1px solid #eee',
            position: 'sticky',
            top: '70px',
            zIndex: 100
          }}>
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 1rem',
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              {Object.entries(features).map(([key, feature]) => (
                <button
                  key={key}
                  onClick={() => setActiveFeature(key)}
                  style={{
                    padding: '1rem 1.5rem',
                    background: activeFeature === key ? `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)` : 'transparent',
                    color: activeFeature === key ? 'white' : '#666',
                    border: 'none',
                    borderBottom: activeFeature === key ? `3px solid ${primaryColor}` : '3px solid transparent',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontFamily: "'Nunito Sans', sans-serif",
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <i className={`fas ${feature.icon}`}></i> {feature.title}
                </button>
              ))}
            </div>
          </section>

          {/* Feature Details */}
          <section style={{
            padding: '4rem 0',
            background: '#fff'
          }}>
            <div style={{
              maxWidth: '1000px',
              margin: '0 auto',
              padding: '0 2rem'
            }}>
              {Object.entries(features).map(([key, feature]) => (
                <div
                  key={key}
                  id={key}
                  style={{
                    display: activeFeature === key ? 'block' : 'none',
                    animation: 'fadeIn 0.3s ease'
                  }}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '3rem',
                    alignItems: 'start'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '4rem',
                        marginBottom: '1rem',
                        color: primaryColor
                      }}>
                        <i className={`fas ${feature.icon}`}></i>
                      </div>
                      <h2 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: primaryColor,
                        marginBottom: '1rem',
                        fontFamily: "'Permanent Marker', cursive"
                      }}>
                        {feature.title}
                      </h2>
                      <p style={{
                        fontSize: '1.2rem',
                        color: '#666',
                        lineHeight: 1.6,
                        marginBottom: '2rem',
                        fontFamily: "'Nunito Sans', sans-serif"
                      }}>
                        {feature.description}
                      </p>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1rem'
                      }}>
                        {feature.benefits.map((benefit, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '1rem',
                              padding: '1rem',
                              background: '#f8f9fa',
                              borderRadius: '8px',
                              border: '1px solid #eee'
                            }}
                          >
                            <span style={{
                              color: primaryColor,
                              fontSize: '1.25rem',
                              lineHeight: 1
                            }}>
                              ✓
                            </span>
                            <span style={{
                              color: '#555',
                              lineHeight: 1.5,
                              fontFamily: "'Nunito Sans', sans-serif"
                            }}>
                              {benefit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <style jsx>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </section>

          {/* All Features Grid */}
          <section style={{
            padding: '5rem 0',
            background: 'linear-gradient(180deg, #f8f9fa 0%, #fff 100%)'
          }}>
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 2rem'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h2 style={{
                  fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                  fontWeight: 'bold',
                  color: primaryColor,
                  marginBottom: '1rem',
                  fontFamily: "'Permanent Marker', cursive"
                }}>
                  Plus So Much More
                </h2>
                <p style={{
                  fontSize: '1.1rem',
                  color: '#666',
                  maxWidth: '600px',
                  margin: '0 auto',
                  fontFamily: "'Nunito Sans', sans-serif"
                }}>
                  Every tool you need to run your art business, all in one place.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem'
              }}>
                {[
                  { icon: 'fa-chart-line', title: 'Sales Analytics', desc: 'Track your performance and growth' },
                  { icon: 'fa-envelope', title: 'Customer Messages', desc: 'Built-in messaging system' },
                  { icon: 'fa-tags', title: 'Discount Codes', desc: 'Create promotions and sales' },
                  { icon: 'fa-mobile-screen', title: 'Mobile Friendly', desc: 'Manage on any device' },
                  { icon: 'fa-bell', title: 'Order Notifications', desc: 'Instant alerts when you sell' },
                  { icon: 'fa-clipboard-list', title: 'Order Management', desc: 'Track and fulfill orders easily' },
                  { icon: 'fa-bullseye', title: 'SEO Optimized', desc: 'Get found in search engines' },
                  { icon: 'fa-lock', title: 'Secure Platform', desc: 'SSL encryption & fraud protection' },
                  { icon: 'fa-images', title: 'Image Tools', desc: 'Multiple photos per product' },
                  { icon: 'fa-file-contract', title: 'Custom Policies', desc: 'Set your own return rules' },
                  { icon: 'fa-earth-americas', title: 'Global Reach', desc: 'Sell to customers worldwide' },
                  { icon: 'fa-users', title: 'Community', desc: 'Connect with other artists' }
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      border: '1px solid #eee',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem', color: primaryColor }}>
                      <i className={`fas ${item.icon}`}></i>
                    </div>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: secondaryColor,
                      marginBottom: '0.5rem',
                      fontFamily: "'Permanent Marker', cursive"
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#888',
                      margin: 0,
                      fontFamily: "'Nunito Sans', sans-serif"
                    }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section style={{
            padding: '5rem 0',
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              padding: '0 2rem'
            }}>
              <h2 style={{
                fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                fontWeight: 'bold',
                marginBottom: '1rem',
                fontFamily: "'Permanent Marker', cursive"
              }}>
                Ready to Get Started?
              </h2>
              <p style={{
                fontSize: '1.2rem',
                opacity: 0.9,
                marginBottom: '2rem',
                lineHeight: 1.6,
                fontFamily: "'Nunito Sans', sans-serif"
              }}>
                Create your free account and start listing your work today. No credit card required.
              </p>
              <button
                onClick={handleStartSelling}
                style={{
                  background: 'white',
                  color: primaryColor,
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontFamily: "'Nunito Sans', sans-serif",
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Create Your Free Account
              </button>
            </div>
          </section>
        </main>

        <MakersFooter />
      </div>
    </>
  );
}
