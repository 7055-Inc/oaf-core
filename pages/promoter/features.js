import { useState } from 'react';
import PromoterLanding from './index';
import styles from './styles.module.css';

export default function FeaturesLanding() {
  const [showVideoModal, setShowVideoModal] = useState(false);

  const handlePrimaryClick = () => {
    window.location.href = '/signup';
  };

  const handleSecondaryClick = () => {
    setShowVideoModal(true);
  };

  const closeModal = () => {
    setShowVideoModal(false);
  };

  return (
    <PromoterLanding>
      {/* Hero Section - The Operating System for Art Festivals */}
      <section style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        padding: '6rem 0',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center'
      }}>
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
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 'bold',
              lineHeight: 1.2,
              marginBottom: '1.5rem',
              color: '#055474',
              animation: 'slideInLeft 1s ease-out'
            }}>
              Brakebee OS
            </h1>
            
            <h2 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
              fontWeight: '600',
              marginBottom: '2rem',
              color: '#333333',
              animation: 'slideInLeft 1s ease-out 0.2s both'
            }}>
              Every Tool You Need to Run Your Festival
            </h2>

            <p style={{
              fontSize: '1.2rem',
              lineHeight: 1.6,
              marginBottom: '3rem',
              color: '#666666',
              animation: 'slideInLeft 1s ease-out 0.4s both'
            }}>
              Built for a digital world and powered by Leo Art AI, Brakebee is more than a platform — it's a complete operating system for art festivals. Each system works seamlessly together to help you recruit artists, manage applications, promote your event, and grow — starting free.
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap',
              animation: 'fadeInUp 1s ease-out 0.6s both'
            }}>
              <button
                onClick={handlePrimaryClick}
                className={styles.ctaButton}
              >
                🟡 Post Your Event Free
              </button>

              <button
                onClick={handleSecondaryClick}
                className={styles.secondaryButton}
              >
                ⚫ Book a Demo
              </button>
            </div>
          </div>

          {/* Right - OS Hub Animation */}
          <div style={{
            position: 'relative',
            height: '500px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Central OS Hub */}
            <div style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              textAlign: 'center',
              animation: 'pulse 3s ease-in-out infinite',
              boxShadow: '0 0 30px rgba(5, 84, 116, 0.3)',
              zIndex: 2
            }}>
              Brakebee<br />OS
            </div>

            {/* Orbiting System Modules */}
            {[
              { name: 'Discovery', icon: '🧭', angle: 0, color: '#e74c3c', delay: '0s' },
              { name: 'Growth', icon: '📈', angle: 72, color: '#f39c12', delay: '0.5s' },
              { name: 'Application', icon: '📝', angle: 144, color: '#27ae60', delay: '1s' },
              { name: 'Talent', icon: '🎨', angle: 216, color: '#3498db', delay: '1.5s' },
              { name: 'Audience', icon: '📣', angle: 288, color: '#9b59b6', delay: '2s' }
            ].map((module, index) => (
              <div key={index}>
                {/* Connection Line */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '2px',
                  height: '100px',
                  backgroundColor: module.color,
                  transformOrigin: 'top center',
                  transform: `translate(-50%, -50%) rotate(${module.angle}deg)`,
                  animation: `drawLine 1s ease-out ${module.delay} both`,
                  opacity: 0.6
                }} />
                
                {/* System Module */}
                <div style={{
                  position: 'absolute',
                  top: `${50 + 35 * Math.sin(module.angle * Math.PI / 180)}%`,
                  left: `${50 + 35 * Math.cos(module.angle * Math.PI / 180)}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '80px',
                  height: '80px',
                  backgroundColor: module.color,
                  borderRadius: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  animation: `popIn 0.6s ease-out ${module.delay} both`,
                  boxShadow: `0 4px 15px ${module.color}40`,
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translate(-50%, -50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translate(-50%, -50%) scale(1)';
                }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                    {module.icon}
                  </div>
                  {module.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            position: 'relative'
          }}>
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
            
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>
              Brakebee OS Demo
            </h3>
            
            <div style={{
              width: '100%',
              height: '400px',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '5px',
              color: '#666'
            }}>
              Video player will be added here
            </div>
          </div>
        </div>
      )}

      {/* Section 1 - The OS at a Glance */}
      <section style={{
        padding: '6rem 0',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          {/* Headline */}
          <h2 style={{
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '2rem',
            color: '#333333',
            lineHeight: 1.2
          }}>
            One Platform. Five Powerful Systems. <span style={{ color: '#055474' }}>Infinite Possibilities.</span>
          </h2>

          {/* Body */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto 4rem auto',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '1.3rem',
              lineHeight: 1.6,
              color: '#333333',
              marginBottom: '2rem'
            }}>
              Brakebee combines five core systems into one platform, transforming how art festivals are run. Each system is powerful on its own — but together, they form the digital backbone your events deserve.
            </p>
          </div>

          {/* 5 Systems Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            {[
              {
                icon: '🧭',
                name: 'Discovery System',
                tagline: 'Launch Full Event Websites',
                description: 'Auto-build professional event sites with artist profiles, custom domains, and affiliate sales.',
                color: '#e74c3c',
                delay: '0s'
              },
              {
                icon: '📝',
                name: 'Application System',
                tagline: 'Streamline Jury & Payments',
                description: 'Manage applications, jury scoring, and booth fees with automated artist publishing.',
                color: '#f39c12',
                delay: '0.2s'
              },
              {
                icon: '🎨',
                name: 'Talent System',
                tagline: 'VIP Artist Recruitment',
                description: 'Invite artists directly, waive fees, and curate fresh lineups with one-click tools.',
                color: '#27ae60',
                delay: '0.4s'
              },
              {
                icon: '📣',
                name: 'Audience System',
                tagline: 'Email & Promotion Tools',
                description: 'Reach thousands of artists and art lovers with geo-targeted campaigns.',
                color: '#3498db',
                delay: '0.6s'
              },
              {
                icon: '🧠',
                name: 'Leo Art AI',
                tagline: 'Your Intelligent Co-Pilot',
                description: 'AI-powered recommendations, predictions, and automation across all systems.',
                color: '#9b59b6',
                delay: '0.8s'
              }
            ].map((system, index) => (
              <div key={index} style={{
                backgroundColor: '#f8f9fa',
                padding: '2rem',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
                animation: `fadeInUp 0.8s ease-out ${system.delay} both`,
                cursor: 'pointer',
                border: `3px solid transparent`
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-5px)';
                e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                e.target.style.borderColor = system.color;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 5px 20px rgba(0,0,0,0.08)';
                e.target.style.borderColor = 'transparent';
              }}
              >
                {/* Icon */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: system.color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 1.5rem auto',
                  boxShadow: `0 4px 15px ${system.color}40`
                }}>
                  {system.icon}
                </div>

                {/* System Name */}
                <h3 style={{
                  fontSize: '1.4rem',
                  fontWeight: 'bold',
                  color: '#055474',
                  marginBottom: '0.5rem'
                }}>
                  {system.name}
                </h3>

                {/* Tagline */}
                <h4 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: system.color,
                  marginBottom: '1rem'
                }}>
                  {system.tagline}
                </h4>

                {/* Description */}
                <p style={{
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  color: '#666666',
                  margin: 0
                }}>
                  {system.description}
                </p>

                {/* Learn More Link */}
                <div style={{
                  marginTop: '1.5rem'
                }}>
                  <a style={{
                    color: system.color,
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'opacity 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '0.7';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '1';
                  }}
                  >
                    Learn More →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System 1 - Discovery System */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#e74c3c',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '1rem'
                }}>
                  🧭
                </div>
                <h2 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#055474',
                  margin: 0
                }}>
                  Discovery System
                </h2>
              </div>

              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '600',
                color: '#333333',
                marginBottom: '1.5rem'
              }}>
                Launch Full Event Websites in Seconds
              </h3>

              <p style={{
                fontSize: '1.2rem',
                lineHeight: 1.6,
                color: '#666666',
                marginBottom: '2rem'
              }}>
                Turn your festival listing into a full-featured website with no developer required. Each event site auto-pulls artist profiles, application info, and key event details — and can even have its own custom domain for SEO. Showcase artists, sell their work as an affiliate, and build a central hub for your show.
              </p>

              {/* Key Benefits */}
              <div style={{
                marginBottom: '2rem'
              }}>
                {[
                  { icon: '⚡', text: 'Auto-build event websites from your promoter profile' },
                  { icon: '📈', text: 'Boost visibility and SEO with unique domains' },
                  { icon: '🛍️', text: 'Earn affiliate revenue from artist sales' },
                  { icon: '🧭', text: 'Centralize all event info in one place' }
                ].map((benefit, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      fontSize: '1.2rem',
                      marginRight: '1rem'
                    }}>
                      {benefit.icon}
                    </span>
                    <span style={{
                      fontSize: '1.1rem',
                      color: '#333333'
                    }}>
                      {benefit.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button 
                  className={styles.primaryButton}
                >
                  Learn More About Promoter Sites
                </button>
                <button 
                  onClick={handlePrimaryClick}
                  className={styles.secondaryButton}
                >
                  Post Your Event Free
                </button>
              </div>
            </div>

            {/* Right Visual */}
            <div style={{
              position: 'relative'
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                animation: 'slideInRight 1s ease-out'
              }}>
                {/* Browser Header */}
                <div style={{
                  backgroundColor: '#f1f3f4',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f57' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#28ca42' }} />
                  <div style={{
                    marginLeft: '1rem',
                    backgroundColor: '#ffffff',
                    padding: '0.25rem 1rem',
                    borderRadius: '15px',
                    fontSize: '0.8rem',
                    color: '#666666'
                  }}>
                    summerartfest2025.com
                  </div>
                </div>

                {/* Website Content */}
                <div style={{
                  background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
                  color: 'white',
                  padding: '2rem',
                  textAlign: 'center'
                }}>
                  <h4 style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    margin: '0 0 0.5rem 0'
                  }}>
                    Summer Art Festival 2025
                  </h4>
                  <p style={{
                    fontSize: '1rem',
                    margin: '0 0 1rem 0',
                    opacity: 0.9
                  }}>
                    July 15-17 • Central Park, NYC
                  </p>
                </div>

                {/* Artist Gallery */}
                <div style={{
                  padding: '2rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem'
                }}>
                  {[
                    { name: 'Sarah Chen', type: 'Painter', color: '#e74c3c' },
                    { name: 'Mike Torres', type: 'Sculptor', color: '#f39c12' },
                    { name: 'Lisa Park', type: 'Digital', color: '#27ae60' }
                  ].map((artist, index) => (
                    <div key={index} style={{
                      textAlign: 'center',
                      animation: `fadeInUp 0.5s ease-out ${0.2 + index * 0.1}s both`
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: artist.color,
                        borderRadius: '50%',
                        margin: '0 auto 0.5rem auto'
                      }} />
                      <h5 style={{
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        margin: '0 0 0.25rem 0',
                        color: '#333333'
                      }}>
                        {artist.name}
                      </h5>
                      <p style={{
                        fontSize: '0.8rem',
                        color: '#666666',
                        margin: '0 0 0.5rem 0'
                      }}>
                        {artist.type}
                      </p>
                      <button 
                        className={styles.primaryButton}
                      >
                        Shop Work
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System 2 - Application System */}
      <section style={{
        padding: '6rem 0',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            {/* Left Visual */}
            <div style={{
              position: 'relative',
              height: '400px'
            }}>
              <h4 style={{
                textAlign: 'center',
                marginBottom: '2rem',
                color: '#333333',
                fontSize: '1.2rem'
              }}>
                Artist Applies → Jury Approves → Auto-Published
              </h4>

              {/* Application Flow */}
              <div style={{
                position: 'relative',
                height: '300px'
              }}>
                {/* Step 1 */}
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#3498db',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  animation: 'slideInLeft 1s ease-out'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Application<br />Submitted</div>
                </div>

                {/* Arrow 1 */}
                <div style={{
                  position: 'absolute',
                  left: '30%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '2rem',
                  color: '#f39c12',
                  animation: 'slideInLeft 1s ease-out 0.5s both'
                }}>
                  →
                </div>

                {/* Step 2 */}
                <div style={{
                  position: 'absolute',
                  left: '40%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#f39c12',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  animation: 'slideInLeft 1s ease-out 1s both'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚖️</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Jury<br />Review</div>
                </div>

                {/* Arrow 2 */}
                <div style={{
                  position: 'absolute',
                  right: '25%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '2rem',
                  color: '#27ae60',
                  animation: 'slideInLeft 1s ease-out 1.5s both'
                }}>
                  →
                </div>

                {/* Step 3 */}
                <div style={{
                  position: 'absolute',
                  right: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  animation: 'slideInLeft 1s ease-out 2s both'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Auto-Published<br />on Site</div>
                </div>

                {/* Pricing Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#055474',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  animation: 'fadeInUp 1s ease-out 2.5s both'
                }}>
                  5% flat fee includes payment processing
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#f39c12',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '1rem'
                }}>
                  📝
                </div>
                <h2 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#055474',
                  margin: 0
                }}>
                  Application System
                </h2>
              </div>

              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '600',
                color: '#333333',
                marginBottom: '1.5rem'
              }}>
                Streamline Jurying and Payments
              </h3>

              <p style={{
                fontSize: '1.2rem',
                lineHeight: 1.6,
                color: '#666666',
                marginBottom: '2rem'
              }}>
                Manage artist applications, jury scoring, and booth fee payments in one integrated dashboard. As soon as artists are accepted, their profiles automatically appear on your event site. Brakebee handles credit card processing and takes just 5% of all fees — no hidden costs.
              </p>

              {/* Key Benefits */}
              <div style={{
                marginBottom: '2rem'
              }}>
                {[
                  { icon: '📝', text: 'Collect and manage applications with ease' },
                  { icon: '⚖️', text: 'Jury and score artists in a single view' },
                  { icon: '💸', text: 'Collect booth fees and auto-publish accepted artists' },
                  { icon: '🔁', text: '5% flat fee includes payment processing' }
                ].map((benefit, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      fontSize: '1.2rem',
                      marginRight: '1rem'
                    }}>
                      {benefit.icon}
                    </span>
                    <span style={{
                      fontSize: '1.1rem',
                      color: '#333333'
                    }}>
                      {benefit.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button 
                  className={styles.primaryButton}
                >
                  Learn More About Applications
                </button>
                <button 
                  onClick={handlePrimaryClick}
                  className={styles.secondaryButton}
                >
                  Post Your Event Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System 3 - Talent System */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#27ae60',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '1rem'
                }}>
                  🎨
                </div>
                <h2 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#055474',
                  margin: 0
                }}>
                  Talent System
                </h2>
              </div>

              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '600',
                color: '#333333',
                marginBottom: '1.5rem'
              }}>
                Bring Fresh Artists to Your Festival
              </h3>

              <p style={{
                fontSize: '1.2rem',
                lineHeight: 1.6,
                color: '#666666',
                marginBottom: '2rem'
              }}>
                Invite artists directly to apply or join your event with one click. Waive jury requirements or booth fees to attract specific talent and refresh your lineup. Whether you're curating a brand-new show or revitalizing an established one, VIP invites give you control and flexibility.
              </p>

              {/* Key Benefits */}
              <div style={{
                marginBottom: '2rem'
              }}>
                {[
                  { icon: '📩', text: 'Invite artists individually or in bulk' },
                  { icon: '✅', text: 'Bypass jury or fees to secure top talent' },
                  { icon: '🎨', text: 'Curate fresh lineups and raise event quality' },
                  { icon: '🧠', text: 'Save hours recruiting and emailing manually' }
                ].map((benefit, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      fontSize: '1.2rem',
                      marginRight: '1rem'
                    }}>
                      {benefit.icon}
                    </span>
                    <span style={{
                      fontSize: '1.1rem',
                      color: '#333333'
                    }}>
                      {benefit.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button 
                  className={styles.primaryButton}
                >
                  Learn More About Recruitment
                </button>
                <button 
                  onClick={handlePrimaryClick}
                  className={styles.secondaryButton}
                >
                  Post Your Event Free
                </button>
              </div>
            </div>

            {/* Right Visual - VIP Invite Flow */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '1rem',
              alignItems: 'center'
            }}>
              {/* VIP Invite */}
              <div style={{
                backgroundColor: '#9b59b6',
                color: 'white',
                padding: '2rem',
                borderRadius: '15px',
                textAlign: 'center',
                animation: 'slideInLeft 1s ease-out',
                boxShadow: '0 10px 25px rgba(155, 89, 182, 0.3)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👑</div>
                <h4 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  margin: '0 0 1rem 0'
                }}>
                  VIP Invite Sent
                </h4>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '1rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}>
                  <strong>To:</strong> Sarah Chen<br />
                  <strong>Event:</strong> Summer Art Fest<br />
                  <strong>Waived:</strong> Jury Fee ($50)
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                fontSize: '3rem',
                color: '#27ae60',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                →
              </div>

              {/* Artist Accepts */}
              <div style={{
                backgroundColor: '#27ae60',
                color: 'white',
                padding: '2rem',
                borderRadius: '15px',
                textAlign: 'center',
                animation: 'slideInRight 1s ease-out 1s both',
                boxShadow: '0 10px 25px rgba(39, 174, 96, 0.3)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h4 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  margin: '0 0 1rem 0'
                }}>
                  Instantly Accepted
                </h4>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '1rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}>
                  <strong>Sarah Chen</strong><br />
                  Added to Event Roster<br />
                  Profile Live on Site
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System 4 - Audience System */}
      <section style={{
        padding: '6rem 0',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            {/* Left Visual - Email Builder */}
            <div style={{
              position: 'relative'
            }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '15px',
                padding: '2rem',
                animation: 'slideInLeft 1s ease-out',
                boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{
                  color: '#3498db',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  📧 Email Campaign Builder
                </h4>

                {/* Campaign Options */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '2px solid #3498db',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>✅</span>
                    <strong>Your Artist List</strong> (1,247 contacts)
                  </div>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>📍</span>
                    <strong>Regional Artists</strong> (15,000+ in NY)
                  </div>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{ marginRight: '0.5rem' }}>🎨</span>
                    <strong>Art Lovers Network</strong> (50,000+)
                  </div>
                </div>

                <button 
                  className={styles.primaryButton}
                >
                  Send Campaign
                </button>
              </div>

              {/* Reach Heatmap */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                backgroundColor: '#ffffff',
                borderRadius: '15px',
                padding: '1.5rem',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
                animation: 'slideInRight 1s ease-out 1s both'
              }}>
                <h5 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  margin: '0 0 1rem 0',
                  color: '#333333',
                  textAlign: 'center'
                }}>
                  📊 Reach Heatmap
                </h5>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem'
                }}>
                  {[
                    '#ff4444', '#ff6666', '#ff8888', '#ffaaaa',
                    '#ff6666', '#ff2222', '#ff4444', '#ff6666',
                    '#ff8888', '#ff4444', '#ff6666', '#ff8888',
                    '#ffaaaa', '#ff6666', '#ff8888', '#ffcccc'
                  ].map((color, index) => (
                    <div key={index} style={{
                      width: '25px',
                      height: '25px',
                      backgroundColor: color,
                      borderRadius: '3px',
                      animation: `fadeInUp 0.3s ease-out ${1.5 + index * 0.05}s both`
                    }} />
                  ))}
                </div>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#666666',
                  margin: '1rem 0 0 0',
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  66,247 reached
                </p>
              </div>
            </div>

            {/* Right Content */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#3498db',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '1rem'
                }}>
                  📣
                </div>
                <h2 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#055474',
                  margin: 0
                }}>
                  Audience System
                </h2>
              </div>

              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '600',
                color: '#333333',
                marginBottom: '1.5rem'
              }}>
                Reach Artists and Attendees Directly
              </h3>

              <p style={{
                fontSize: '1.2rem',
                lineHeight: 1.6,
                color: '#666666',
                marginBottom: '2rem'
              }}>
                Promote your events without lifting a finger. Send announcements to your own list or reach thousands of artists and art lovers in our community — filtered by region or state. Promote new events, announce deadlines, or boost attendance in just a few clicks.
              </p>

              {/* Key Benefits */}
              <div style={{
                marginBottom: '2rem'
              }}>
                {[
                  { icon: '✉️', text: 'Built-in email tools for promoters' },
                  { icon: '📍', text: 'Geo-targeted blasts to artists and audiences' },
                  { icon: '📆', text: 'Promote shows, deadlines, and ticket sales' },
                  { icon: '📈', text: 'Expand visibility without extra work' }
                ].map((benefit, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      fontSize: '1.2rem',
                      marginRight: '1rem'
                    }}>
                      {benefit.icon}
                    </span>
                    <span style={{
                      fontSize: '1.1rem',
                      color: '#333333'
                    }}>
                      {benefit.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button 
                  className={styles.primaryButton}
                >
                  Learn More About Promotion Tools
                </button>
                <button 
                  onClick={handlePrimaryClick}
                  className={styles.secondaryButton}
                >
                  Post Your Event Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System 5 - Leo Art AI */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#9b59b6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginRight: '1rem'
                }}>
                  🧠
                </div>
                <h2 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#055474',
                  margin: 0
                }}>
                  Leo Art AI
                </h2>
              </div>

              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '600',
                color: '#333333',
                marginBottom: '1.5rem'
              }}>
                Your Festival's Intelligent Co-Pilot
              </h3>

              <p style={{
                fontSize: '1.2rem',
                lineHeight: 1.6,
                color: '#666666',
                marginBottom: '2rem'
              }}>
                Behind Brakebee is Leo Art AI, a continuously learning system that powers recommendations, insights, and automation across every tool. As Leo grows, your events get smarter — from predicting which artists will apply to suggesting the best times and places to promote.
              </p>

              {/* Key Benefits */}
              <div style={{
                marginBottom: '2rem'
              }}>
                {[
                  { icon: '🤖', text: 'AI-powered artist recommendations' },
                  { icon: '📊', text: 'Predictive booth-filling and application forecasting' },
                  { icon: '📈', text: 'Smart promotion suggestions by region and season' },
                  { icon: '🧠', text: 'Automated workflows that save time and grow results' }
                ].map((benefit, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      fontSize: '1.2rem',
                      marginRight: '1rem'
                    }}>
                      {benefit.icon}
                    </span>
                    <span style={{
                      fontSize: '1.1rem',
                      color: '#333333'
                    }}>
                      {benefit.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button 
                  className={styles.primaryButton}
                >
                  Learn More About Leo AI
                </button>
                <button 
                  onClick={handlePrimaryClick}
                  className={styles.secondaryButton}
                >
                  Post Your Event Free
                </button>
              </div>
            </div>

            {/* Right Visual - Leo AI Brain */}
            <div style={{
              position: 'relative',
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Central Leo Brain */}
              <div style={{
                position: 'absolute',
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2.5rem',
                animation: 'pulse 3s ease-in-out infinite',
                boxShadow: '0 0 30px rgba(155, 89, 182, 0.4)',
                zIndex: 2
              }}>
                🧠
              </div>

              {/* Leo Badge */}
              <div style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                backgroundColor: '#ffffff',
                color: '#9b59b6',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                animation: 'fadeInUp 1s ease-out 1s both'
              }}>
                Leo Art AI
              </div>

              {/* Connection Lines to Systems */}
              {[
                { angle: 0, color: '#e74c3c', label: 'Discovery', delay: '0.5s' },
                { angle: 72, color: '#f39c12', label: 'Application', delay: '1s' },
                { angle: 144, color: '#27ae60', label: 'Talent', delay: '1.5s' },
                { angle: 216, color: '#3498db', label: 'Audience', delay: '2s' }
              ].map((connection, index) => (
                <div key={index}>
                  {/* Connection Line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '3px',
                    height: '80px',
                    backgroundColor: connection.color,
                    transformOrigin: 'top center',
                    transform: `translate(-50%, -50%) rotate(${connection.angle}deg)`,
                    animation: `drawLine 1s ease-out ${connection.delay} both`,
                    opacity: 0.7
                  }} />
                  
                  {/* System Node */}
                  <div style={{
                    position: 'absolute',
                    top: `${50 + 25 * Math.sin(connection.angle * Math.PI / 180)}%`,
                    left: `${50 + 25 * Math.cos(connection.angle * Math.PI / 180)}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '60px',
                    height: '60px',
                    backgroundColor: connection.color,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    animation: `popIn 0.6s ease-out ${connection.delay} both`,
                    boxShadow: `0 4px 15px ${connection.color}40`
                  }}>
                    {connection.label}
                  </div>
                </div>
              ))}

              {/* AI Insights */}
              <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '10%',
                backgroundColor: '#28a745',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                animation: 'slideInUp 1s ease-out 3s both',
                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)'
              }}>
                💡 Smart Insights
              </div>

              <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '10%',
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                animation: 'slideInUp 1s ease-out 3.5s both',
                boxShadow: '0 4px 15px rgba(220, 53, 69, 0.4)'
              }}>
                🎯 Predictions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Tools Section */}
      <section style={{
        padding: '6rem 0',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          {/* Headline */}
          <h2 style={{
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '2rem',
            color: '#333333',
            lineHeight: 1.2
          }}>
            We're Just <span style={{ color: '#055474' }}>Getting Started</span>
          </h2>

          {/* Copy */}
          <div style={{
            maxWidth: '700px',
            margin: '0 auto 4rem auto',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '1.3rem',
              lineHeight: 1.6,
              color: '#333333',
              marginBottom: '1.5rem'
            }}>
              Brakebee is built to grow. Our upcoming features will make your festivals more interactive, more profitable, and more connected — and <strong>early promoters will unlock them free.</strong>
            </p>
          </div>

          {/* Future Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem'
          }}>
            {[
              {
                icon: '📍',
                title: 'Mobile App',
                subtitle: 'Coming 2026',
                description: 'AR navigation, geofenced push notifications, and live attendee engagement tools.',
                color: '#e74c3c',
                delay: '0s'
              },
              {
                icon: '🛍️',
                title: 'Post-Event Marketplace',
                subtitle: 'Coming Soon',
                description: 'Keep selling artist work and earning commission long after teardown.',
                color: '#f39c12',
                delay: '0.3s'
              },
              {
                icon: '🧠',
                title: 'Smart Attendee Experiences',
                subtitle: 'In Development',
                description: 'Personalized recommendations and offers on-site and beyond.',
                color: '#27ae60',
                delay: '0.6s'
              }
            ].map((feature, index) => (
              <div key={index} style={{
                backgroundColor: '#f8f9fa',
                padding: '2.5rem',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                animation: `fadeInUp 0.8s ease-out ${feature.delay} both`,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Coming Soon Badge */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: feature.color,
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.7rem',
                  fontWeight: '600'
                }}>
                  {feature.subtitle}
                </div>

                {/* Icon */}
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '1.5rem'
                }}>
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#055474',
                  marginBottom: '1rem'
                }}>
                  {feature.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: '1.1rem',
                  lineHeight: 1.5,
                  color: '#666666',
                  margin: 0
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Early Access Promise */}
          <div style={{
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            padding: '3rem 2rem',
            borderRadius: '15px',
            border: '3px solid #055474'
          }}>
            <h3 style={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: '#055474',
              marginBottom: '1rem'
            }}>
              🎉 Early Promoter Promise
            </h3>
            <p style={{
              fontSize: '1.2rem',
              lineHeight: 1.6,
              color: '#333333',
              marginBottom: '2rem'
            }}>
              These tools will become part of our premium tier — but <strong>early promoters who join now will receive access at no extra cost.</strong>
            </p>
            <button
              onClick={handlePrimaryClick}
              className={styles.ctaButton}
            >
              Join as an Early Promoter
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Animation */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          opacity: 0.1
        }}>
          {/* Central OS Core */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100px',
            height: '100px',
            backgroundColor: 'white',
            borderRadius: '50%',
            animation: 'pulse 4s ease-in-out infinite'
          }} />

          {/* Orbiting Systems */}
          {[
            { name: 'Discovery', angle: 0, radius: 200, speed: '20s' },
            { name: 'Application', angle: 90, radius: 180, speed: '25s' },
            { name: 'Talent', angle: 180, radius: 220, speed: '30s' },
            { name: 'Audience', angle: 270, radius: 190, speed: '22s' }
          ].map((system, index) => (
            <div key={index} style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '60px',
              height: '60px',
              backgroundColor: 'white',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: '600',
              color: '#055474',
              animation: `orbit${index + 1} ${system.speed} linear infinite`,
              transformOrigin: `0 0`
            }}>
              {system.name}
            </div>
          ))}
        </div>

        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Headline */}
          <h2 style={{
            fontSize: 'clamp(2.5rem, 4vw, 4rem)',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            lineHeight: 1.2,
            animation: 'fadeInUp 1s ease-out'
          }}>
            Build Your Show on the OS for the Future
          </h2>

          {/* Subhead */}
          <p style={{
            fontSize: '1.5rem',
            marginBottom: '3rem',
            opacity: 0.9,
            animation: 'fadeInUp 1s ease-out 0.3s both'
          }}>
            Start free today. Grow with Leo. Build the art festival you've always wanted.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '2rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'fadeInUp 1s ease-out 0.6s both'
          }}>
            <button
              onClick={handlePrimaryClick}
              className={styles.ctaButton}
            >
              🟡 Post Your Event Free
            </button>

            <button
              onClick={handleSecondaryClick}
              className={styles.secondaryButton}
            >
              ⚫ Book a Demo
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 30px rgba(5, 84, 116, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 40px rgba(5, 84, 116, 0.5);
          }
        }

        @keyframes drawLine {
          from {
            height: 0;
          }
          to {
            height: 100px;
          }
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          80% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @media (max-width: 768px) {
          section > div {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
            text-align: center;
          }
          
          section > div > div:last-child {
            height: 300px !important;
            order: -1;
          }

          /* Simplify mobile animations */
          div[style*="position: absolute"][style*="drawLine"] {
            display: none !important;
          }

          div[style*="Brakebee OS"] {
            position: relative !important;
            margin: 2rem auto !important;
          }

          /* Mobile system sections */
          section div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }

          /* Mobile future features */
          div[style*="gridTemplateColumns: repeat(auto-fit, minmax(350px, 1fr))"] {
            grid-template-columns: 1fr !important;
          }

          /* Hide complex animations on mobile */
          div[style*="position: absolute"][style*="animation"] {
            display: none !important;
          }

          /* Keep essential elements visible */
          div[style*="Central Leo Brain"],
          div[style*="Leo Art AI"],
          div[style*="VIP Invite"],
          div[style*="Email Campaign"] {
            position: relative !important;
            margin: 1rem auto !important;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes orbit1 {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(200px) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(200px) rotate(-360deg);
          }
        }

        @keyframes orbit2 {
          0% {
            transform: translate(-50%, -50%) rotate(90deg) translateX(180px) rotate(-90deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(450deg) translateX(180px) rotate(-450deg);
          }
        }

        @keyframes orbit3 {
          0% {
            transform: translate(-50%, -50%) rotate(180deg) translateX(220px) rotate(-180deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(540deg) translateX(220px) rotate(-540deg);
          }
        }

        @keyframes orbit4 {
          0% {
            transform: translate(-50%, -50%) rotate(270deg) translateX(190px) rotate(-270deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(630deg) translateX(190px) rotate(-630deg);
          }
        }
      `}</style>
    </PromoterLanding>
  );
}
