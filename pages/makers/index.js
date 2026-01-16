import { useState } from 'react';
import Head from 'next/head';
import MakersHeader from './header';
import MakersFooter from './footer';
import styles from './styles.module.css';

export default function MakersLanding() {
  // Brakebee brand colors
  const primaryColor = '#055474';
  const secondaryColor = '#3E1C56';
  const textColor = '#333333';

  const handleStartSelling = () => {
    window.location.href = '/signup';
  };

  const handleLearnMore = () => {
    window.location.href = '/makers/features';
  };

  return (
    <>
      <Head>
        <title>Sell Your Art on Brakebee | For Artists & Makers</title>
        <meta name="description" content="Join thousands of artists selling on Brakebee. List your work on our curated marketplace, create your own storefront, sell at events, and grow your art business with AI-powered tools." />
        <link rel="canonical" href="https://brakebee.com/makers" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <MakersHeader />

        <main style={{ flex: 1 }}>
          {/* Hero Section */}
          <section id="hero" style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            padding: '5rem 0',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '85vh',
            display: 'flex',
            alignItems: 'center'
          }}>
            {/* Decorative Elements */}
            <div style={{
              position: 'absolute',
              top: '10%',
              right: '5%',
              width: '300px',
              height: '300px',
              background: `radial-gradient(circle, ${primaryColor}15 0%, transparent 70%)`,
              borderRadius: '50%',
              animation: 'pulse 4s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '15%',
              left: '3%',
              width: '200px',
              height: '200px',
              background: `radial-gradient(circle, ${secondaryColor}15 0%, transparent 70%)`,
              borderRadius: '50%',
              animation: 'pulse 5s ease-in-out infinite reverse'
            }} />

            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 2rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4rem',
              alignItems: 'center'
            }}>
              {/* Left Content */}
              <div>
                <div style={{
                  display: 'inline-block',
                  background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  fontFamily: "'Nunito Sans', sans-serif"
                }}>
                  🎨 For Artists & Makers
                </div>

                <h1 style={{
                  fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                  fontWeight: 'bold',
                  lineHeight: 1.15,
                  marginBottom: '1.5rem',
                  color: primaryColor,
                  fontFamily: "'Permanent Marker', cursive"
                }}>
                  Turn Your Art Into a Business
                </h1>
                
                <p style={{
                  fontSize: '1.25rem',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                  color: textColor,
                  fontFamily: "'Nunito Sans', sans-serif"
                }}>
                  Sell on our curated marketplace, create your own storefront, and reach collectors at art fairs — all from one platform built specifically for artists and makers.
                </p>

                {/* Zero Risk CTA */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(5, 84, 116, 0.08) 0%, rgba(62, 28, 86, 0.08) 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  border: `2px solid ${primaryColor}20`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <i className="fas fa-shield-check" style={{ color: primaryColor, fontSize: '1.5rem' }}></i>
                    <span style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: primaryColor,
                      fontFamily: "'Nunito Sans', sans-serif"
                    }}>
                      100% Free to Get Started — Zero Risk
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fas fa-check-circle" style={{ color: '#198754', fontSize: '1rem' }}></i>
                      <span style={{ color: textColor, fontFamily: "'Nunito Sans', sans-serif", fontSize: '0.95rem' }}>Free Artist Profile</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fas fa-check-circle" style={{ color: '#198754', fontSize: '1rem' }}></i>
                      <span style={{ color: textColor, fontFamily: "'Nunito Sans', sans-serif", fontSize: '0.95rem' }}>Free Event Calendar</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fas fa-check-circle" style={{ color: '#198754', fontSize: '1rem' }}></i>
                      <span style={{ color: textColor, fontFamily: "'Nunito Sans', sans-serif", fontSize: '0.95rem' }}>Free Product Management</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fas fa-check-circle" style={{ color: '#198754', fontSize: '1rem' }}></i>
                      <span style={{ color: textColor, fontFamily: "'Nunito Sans', sans-serif", fontSize: '0.95rem' }}>No Monthly Fees</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={handleStartSelling}
                    className={styles.ctaButton}
                  >
                    Create Your Free Account
                  </button>
                  <button
                    onClick={handleLearnMore}
                    className={styles.secondaryButton}
                  >
                    See All Features
                  </button>
                </div>
              </div>

              {/* Right - Visual */}
              <div style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '450px',
                  aspectRatio: '1',
                  background: 'linear-gradient(145deg, #fff 0%, #f5f5f5 100%)',
                  borderRadius: '20px',
                  boxShadow: '0 25px 80px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Mock Storefront Preview */}
                  <div style={{
                    background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    padding: '1rem',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    fontFamily: "'Nunito Sans', sans-serif"
                  }}>
                    Your Storefront Preview
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem'
                  }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        background: `linear-gradient(135deg, hsl(${180 + i * 20}, 30%, 90%) 0%, hsl(${180 + i * 20}, 30%, 80%) 100%)`,
                        borderRadius: '8px',
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem'
                      }}>
                        {['🖼️', '🎨', '🏺', '✨'][i - 1]}
                      </div>
                    ))}
                  </div>
                  <div style={{
                    borderTop: '1px solid #eee',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fafafa'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#666', fontFamily: "'Nunito Sans', sans-serif" }}>4 Products Listed</span>
                    <span style={{ 
                      background: primaryColor, 
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>Live</span>
                  </div>
                </div>
              </div>
            </div>

            <style jsx>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.1); opacity: 0.8; }
              }
              @media (max-width: 900px) {
                section > div > div {
                  grid-template-columns: 1fr !important;
                  text-align: center;
                }
              }
            `}</style>
          </section>

          {/* Why Brakebee Section */}
          <section id="why-brakebee" style={{
            padding: '5rem 0',
            background: '#fff'
          }}>
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 2rem'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h2 style={{
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                  fontWeight: 'bold',
                  color: primaryColor,
                  marginBottom: '1rem',
                  fontFamily: "'Permanent Marker', cursive"
                }}>
                  Why Artists Choose Brakebee
                </h2>
                <p style={{
                  fontSize: '1.15rem',
                  color: '#666',
                  maxWidth: '700px',
                  margin: '0 auto',
                  lineHeight: 1.6,
                  fontFamily: "'Nunito Sans', sans-serif"
                }}>
                  Built by artists, for artists. We understand the unique needs of creative businesses.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem'
              }}>
                {[
                  {
                    icon: 'fa-store',
                    title: 'Curated Marketplace',
                    description: 'Your work appears alongside other verified artists in a marketplace that celebrates craftsmanship and quality.'
                  },
                  {
                    icon: 'fa-globe',
                    title: 'Your Own Storefront',
                    description: 'Get a custom subdomain (yourname.brakebee.com) or bring your own domain to build a full website with your branding, bio, and complete product catalog.'
                  },
                  {
                    icon: 'fa-calendar-check',
                    title: 'Sell at Events',
                    description: 'Apply to art fairs and festivals directly through the platform. Accept payments on-site with our POS tools.'
                  },
                  {
                    icon: 'fa-robot',
                    title: 'AI-Powered Tools',
                    description: 'Leo Art AI helps with product descriptions, pricing suggestions, and customer inquiries automatically.'
                  },
                  {
                    icon: 'fa-hand-holding-dollar',
                    title: 'Flexible Pricing',
                    description: 'Start free with the core platform. Add features as you grow with optional subscriptions. Only pay commission when you sell.'
                  },
                  {
                    icon: 'fa-truck-fast',
                    title: 'Simple Shipping',
                    description: 'Integrated shipping labels, tracking, and calculated rates. All artists get access to discounted rates for printing 1-off labels.'
                  }
                ].map((feature, index) => (
                  <div key={index} style={{
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    padding: '2rem',
                    transition: 'all 0.3s ease',
                    border: '1px solid #eee'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ 
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem'
                    }}>
                      <i className={`fas ${feature.icon}`} style={{ fontSize: '1.75rem', color: primaryColor }}></i>
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: secondaryColor,
                      marginBottom: '0.75rem',
                      fontFamily: "'Permanent Marker', cursive"
                    }}>
                      {feature.title}
                    </h3>
                    <p style={{
                      color: '#666',
                      lineHeight: 1.6,
                      margin: 0,
                      fontFamily: "'Nunito Sans', sans-serif"
                    }}>
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" style={{
            padding: '5rem 0',
            background: 'linear-gradient(180deg, #f8f9fa 0%, #fff 100%)'
          }}>
            <div style={{
              maxWidth: '1000px',
              margin: '0 auto',
              padding: '0 2rem'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h2 style={{
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                  fontWeight: 'bold',
                  color: primaryColor,
                  marginBottom: '1rem',
                  fontFamily: "'Permanent Marker', cursive"
                }}>
                  Start Selling in Minutes
                </h2>
                <p style={{
                  fontSize: '1.15rem',
                  color: '#666',
                  maxWidth: '600px',
                  margin: '0 auto',
                  fontFamily: "'Nunito Sans', sans-serif"
                }}>
                  Get set up quickly and start reaching customers right away.
                </p>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3rem'
              }}>
                {[
                  {
                    step: '1',
                    title: 'Create Your Profile',
                    description: 'Sign up free and tell us about yourself and your art. Add your bio, profile photo, and studio details.',
                    time: '5 minutes'
                  },
                  {
                    step: '2',
                    title: 'Apply to the Marketplace',
                    description: 'Submit your application to join our curated marketplace. We review each artist to maintain quality and authenticity.',
                    time: '1-2 days review'
                  },
                  {
                    step: '3',
                    title: 'List Your Products',
                    description: 'Upload photos of your work, set prices, and add descriptions. Leo AI can help write compelling descriptions.',
                    time: '10 minutes per item'
                  },
                  {
                    step: '4',
                    title: 'Connect Payments',
                    description: 'Link your bank account through Stripe for secure, fast payouts. Get paid within 24 hours of each sale.',
                    time: '3 minutes'
                  },
                  {
                    step: '5',
                    title: 'Start Selling',
                    description: 'Your products go live on the marketplace and your personal storefront. Share your link and start making sales!',
                    time: 'Instant'
                  }
                ].map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    gap: '2rem',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      fontFamily: "'Permanent Marker', cursive"
                    }}>
                      {item.step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <h3 style={{
                          fontSize: '1.35rem',
                          fontWeight: '600',
                          color: secondaryColor,
                          margin: 0,
                          fontFamily: "'Permanent Marker', cursive"
                        }}>
                          {item.title}
                        </h3>
                        <span style={{
                          background: '#e8f4f8',
                          color: primaryColor,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          fontFamily: "'Nunito Sans', sans-serif"
                        }}>
                          ⏱️ {item.time}
                        </span>
                      </div>
                      <p style={{
                        color: '#666',
                        lineHeight: 1.6,
                        margin: 0,
                        fontFamily: "'Nunito Sans', sans-serif"
                      }}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <button
                  onClick={handleStartSelling}
                  className={styles.ctaButton}
                >
                  Create Your Free Account
                </button>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" style={{
            padding: '5rem 0',
            background: '#fff'
          }}>
            <div style={{
              maxWidth: '1000px',
              margin: '0 auto',
              padding: '0 2rem'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h2 style={{
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                  fontWeight: 'bold',
                  color: primaryColor,
                  marginBottom: '1rem',
                  fontFamily: "'Permanent Marker', cursive"
                }}>
                  Simple, Fair Pricing
                </h2>
                <p style={{
                  fontSize: '1.15rem',
                  color: '#666',
                  maxWidth: '600px',
                  margin: '0 auto',
                  fontFamily: "'Nunito Sans', sans-serif"
                }}>
                  Start free. Pay only when you sell. Add features as you grow.
                </p>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                maxWidth: '500px',
                margin: '0 auto'
              }}>
                {/* Marketplace Sales */}
                <div style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  borderRadius: '16px',
                  padding: '2.5rem',
                  color: 'white',
                  textAlign: 'center',
                  width: '100%'
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.8)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '1rem',
                    fontFamily: "'Nunito Sans', sans-serif"
                  }}>
                    Marketplace Sales
                  </div>
                  <div style={{
                    fontSize: '3.5rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    fontFamily: "'Permanent Marker', cursive"
                  }}>
                    15%
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    fontFamily: "'Nunito Sans', sans-serif"
                  }}>
                    Flat Fee
                  </div>
                  <div style={{
                    opacity: 0.9,
                    marginBottom: '2rem',
                    fontFamily: "'Nunito Sans', sans-serif",
                    fontSize: '0.95rem'
                  }}>
                    Only pay when you sell.
                  </div>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    textAlign: 'left'
                  }}>
                    {[
                      'Featured in curated marketplace',
                      'Upgrade for your own storefront URL',
                      'Leo AI product descriptions',
                      'Discounted shipping label generation',
                      'Customer messaging tools',
                      'Sell wholesale to galleries, boutiques and via Brakebee Distribution'
                    ].map((feature, i) => (
                      <li key={i} style={{
                        padding: '0.75rem 0',
                        borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontFamily: "'Nunito Sans', sans-serif"
                      }}>
                        <span>✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p style={{
                textAlign: 'center',
                marginTop: '2rem',
                color: '#888',
                fontSize: '0.9rem',
                fontFamily: "'Nunito Sans', sans-serif"
              }}>
                Payment processing fees (2.9% + $0.30) apply to all card transactions via Stripe.
              </p>
            </div>
          </section>

          {/* Success Stories */}
          <section id="success-stories" style={{
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
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                  fontWeight: 'bold',
                  color: primaryColor,
                  marginBottom: '1rem',
                  fontFamily: "'Permanent Marker', cursive"
                }}>
                  Artists Love Brakebee
                </h2>
                <p style={{
                  fontSize: '1.15rem',
                  color: '#666',
                  maxWidth: '600px',
                  margin: '0 auto',
                  fontFamily: "'Nunito Sans', sans-serif"
                }}>
                  Join a growing community of artists building successful creative businesses.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem'
              }}>
                {[
                  {
                    quote: "Brakebee made it so easy to set up my online store. I was selling within a day of signing up. The AI descriptions saved me hours!",
                    author: "Sarah M.",
                    title: "Ceramic Artist",
                    avatar: "🏺"
                  },
                  {
                    quote: "I've done a dozen art fairs through Brakebee. The event integration is seamless - one platform for everything.",
                    author: "Michael R.",
                    title: "Painter",
                    avatar: "🎨"
                  },
                  {
                    quote: "The low fees mean I actually keep what I earn. No surprise charges, no monthly bills eating into my profits.",
                    author: "Jennifer L.",
                    title: "Jewelry Designer",
                    avatar: "💎"
                  }
                ].map((testimonial, index) => (
                  <div key={index} style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    border: '1px solid #eee'
                  }}>
                    <div style={{
                      fontSize: '3rem',
                      marginBottom: '1rem',
                      opacity: 0.2,
                      color: primaryColor
                    }}>
                      "
                    </div>
                    <p style={{
                      color: '#555',
                      lineHeight: 1.7,
                      marginBottom: '1.5rem',
                      fontStyle: 'italic',
                      fontFamily: "'Nunito Sans', sans-serif"
                    }}>
                      {testimonial.quote}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: '#f8f9fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}>
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: secondaryColor,
                          fontFamily: "'Nunito Sans', sans-serif"
                        }}>
                          {testimonial.author}
                        </div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#888',
                          fontFamily: "'Nunito Sans', sans-serif"
                        }}>
                          {testimonial.title}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
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
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                fontWeight: 'bold',
                marginBottom: '1rem',
                fontFamily: "'Permanent Marker', cursive"
              }}>
                Ready to Start Selling?
              </h2>
              <p style={{
                fontSize: '1.25rem',
                opacity: 0.9,
                marginBottom: '2rem',
                lineHeight: 1.6,
                fontFamily: "'Nunito Sans', sans-serif"
              }}>
                Join thousands of artists who are growing their creative businesses on Brakebee. It's free to start, and you can be selling in minutes.
              </p>
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
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
                <button
                  onClick={() => window.location.href = '/help/contact'}
                  style={{
                    background: 'transparent',
                    color: 'white',
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    border: '2px solid white',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontFamily: "'Nunito Sans', sans-serif",
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.color = primaryColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'white';
                  }}
                >
                  Contact Us
                </button>
              </div>
            </div>
          </section>
        </main>

        <MakersFooter />
      </div>
    </>
  );
}
