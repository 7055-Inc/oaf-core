import { useState } from 'react';
import PromoterLanding from './index';
import styles from './styles.module.css';

export default function LearnMoreLanding() {
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
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        padding: '6rem 0',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* AI Brain Circuit Background */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '200px',
          height: '200px',
          opacity: 0.1,
          animation: 'pulse 3s ease-in-out infinite'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            border: '2px solid #055474',
            borderRadius: '50%',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '20%',
              left: '20%',
              width: '60%',
              height: '60%',
              border: '1px solid #055474',
              borderRadius: '50%',
              animation: 'rotate 8s linear infinite'
            }}>
              <div style={{
                position: 'absolute',
                top: '30%',
                left: '30%',
                width: '40%',
                height: '40%',
                backgroundColor: '#055474',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite reverse'
              }} />
            </div>
          </div>
        </div>

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
              Brakebee
            </h1>
            
            <h2 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
              fontWeight: '600',
              marginBottom: '2rem',
              color: '#333333',
              animation: 'slideInLeft 1s ease-out 0.2s both'
            }}>
              Your complete Operating System for Art Festivals
            </h2>

            <p style={{
              fontSize: '1.2rem',
              lineHeight: 1.6,
              marginBottom: '3rem',
              color: '#666666',
              animation: 'slideInLeft 1s ease-out 0.4s both'
            }}>
              Built for a digital world and powered by Leo Art AI, Brakebee brings every tool you need to recruit artists, promote your event, manage applications, and grow — sign up and post your event for free!
            </p>

            {/* Animated Tagline */}
            <div style={{
              marginBottom: '3rem',
              animation: 'fadeInUp 1s ease-out 0.8s both'
            }}>
              <p style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#3e1c56',
                fontStyle: 'italic',
                animation: 'typewriter 3s steps(40) 1s both'
              }}>
                "Built for promoters. Powered by AI. Free to start."
              </p>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap',
              animation: 'fadeInUp 1s ease-out 1s both'
            }}>
              <button
                onClick={handlePrimaryClick}
                className={styles.primaryButton}
              >
                Post your free event
              </button>

              <button
                onClick={handleSecondaryClick}
                className={styles.secondaryButton}
              >
                Watch a short overview
              </button>
            </div>
          </div>

          {/* Right Animation Area */}
          <div style={{
            position: 'relative',
            height: '500px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Laptop */}
            <div style={{
              width: '300px',
              height: '200px',
              backgroundColor: '#2c3e50',
              borderRadius: '10px 10px 0 0',
              position: 'relative',
              animation: 'float 6s ease-in-out infinite',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              {/* Screen */}
              <div style={{
                width: '280px',
                height: '175px',
                backgroundColor: '#055474',
                margin: '10px auto',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                Promoter Dashboard
              </div>
              
              {/* Laptop Base */}
              <div style={{
                width: '320px',
                height: '20px',
                backgroundColor: '#34495e',
                borderRadius: '0 0 15px 15px',
                position: 'absolute',
                top: '200px',
                left: '-10px'
              }} />
            </div>

            {/* Orbiting Elements */}
            {/* AR App */}
            <div style={{
              position: 'absolute',
              width: '60px',
              height: '60px',
              backgroundColor: '#e74c3c',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: '600',
              animation: 'orbit1 8s linear infinite',
              boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
            }}>
              AR App
            </div>

            {/* Artist Marketplace */}
            <div style={{
              position: 'absolute',
              width: '80px',
              height: '60px',
              backgroundColor: '#f39c12',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: '600',
              textAlign: 'center',
              animation: 'orbit2 10s linear infinite',
              boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)'
            }}>
              Artist Market
            </div>

            {/* Management Tools */}
            <div style={{
              position: 'absolute',
              width: '70px',
              height: '50px',
              backgroundColor: '#27ae60',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: '600',
              textAlign: 'center',
              animation: 'orbit3 12s linear infinite',
              boxShadow: '0 4px 15px rgba(39, 174, 96, 0.4)'
            }}>
              Mgmt Tools
            </div>
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
              Brakebee Overview Video
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

      {/* Section 1 - The Why (Category Creation Story) */}
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
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '3rem',
            color: '#333333',
            lineHeight: 1.2
          }}>
            Art Festivals Haven't Changed in Decades.<br />
            <span style={{ color: '#055474' }}>Brakebee Changes Everything.</span>
          </h2>

          {/* Timeline Graphic */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '2rem',
            alignItems: 'center',
            marginBottom: '4rem',
            padding: '2rem 0'
          }}>
            {/* Old Way */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '2rem',
              borderRadius: '10px',
              border: '2px solid #e9ecef',
              position: 'relative'
            }}>
              <h3 style={{
                color: '#dc3545',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                The Old Way
              </h3>
              
              {/* Chaotic Elements */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                opacity: 0.8
              }}>
                {/* Spreadsheet */}
                <div style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  fontSize: '0.9rem',
                  transform: 'rotate(-2deg)',
                  animation: 'shake 2s ease-in-out infinite'
                }}>
                  📊 Excel Spreadsheets
                </div>
                
                {/* Email */}
                <div style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  fontSize: '0.9rem',
                  transform: 'rotate(1deg)',
                  animation: 'shake 2s ease-in-out infinite 0.5s'
                }}>
                  📧 Email Threads
                </div>
                
                {/* Forms */}
                <div style={{
                  backgroundColor: '#fd7e14',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  fontSize: '0.9rem',
                  transform: 'rotate(-1deg)',
                  animation: 'shake 2s ease-in-out infinite 1s'
                }}>
                  📝 Paper Forms
                </div>
                
                {/* Guesswork */}
                <div style={{
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  fontSize: '0.9rem',
                  transform: 'rotate(2deg)',
                  animation: 'shake 2s ease-in-out infinite 1.5s'
                }}>
                  🤔 Pure Guesswork
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div style={{
              fontSize: '3rem',
              color: '#055474',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              →
            </div>

            {/* New Way */}
            <div style={{
              background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
              color: 'white',
              padding: '2rem',
              borderRadius: '10px',
              position: 'relative',
              boxShadow: '0 10px 30px rgba(5, 84, 116, 0.3)'
            }}>
              <h3 style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                The Brakebee Way
              </h3>
              
              {/* Organized Flow */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.75rem 1rem',
                  borderRadius: '25px',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  animation: 'slideInRight 0.5s ease-out'
                }}>
                  🎯 Smart Recruitment
                </div>
                
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.75rem 1rem',
                  borderRadius: '25px',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  animation: 'slideInRight 0.5s ease-out 0.2s both'
                }}>
                  📱 Digital Promotion
                </div>
                
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.75rem 1rem',
                  borderRadius: '25px',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  animation: 'slideInRight 0.5s ease-out 0.4s both'
                }}>
                  🤖 AI Management
                </div>
                
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.75rem 1rem',
                  borderRadius: '25px',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  animation: 'slideInRight 0.5s ease-out 0.6s both'
                }}>
                  💰 Revenue Growth
                </div>
              </div>
            </div>
          </div>

          {/* Body Copy */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '1.3rem',
              lineHeight: 1.7,
              color: '#333333',
              marginBottom: '2rem'
            }}>
              The world is digital — but art festivals are still running on spreadsheets, forms, and guesswork. We built <strong style={{ color: '#055474' }}>Brakebee</strong>, the new operating system designed specifically for art festivals.
            </p>
            
            <p style={{
              fontSize: '1.2rem',
              lineHeight: 1.6,
              color: '#666666',
              marginBottom: '3rem'
            }}>
              It's the infrastructure that powers every step: recruitment, promotion, management, and even revenue. Start with a free listing. Then grow into a full platform that automates the hard parts and helps your event reach more artists, attract more visitors, and earn more money.
            </p>
          </div>

          {/* Digital Festival Scene */}
          <div style={{
            position: 'relative',
            backgroundColor: '#f8f9fa',
            borderRadius: '15px',
            padding: '3rem 2rem',
            marginTop: '4rem',
            overflow: 'hidden'
          }}>
            {/* Festival Crowd Base */}
            <div style={{
              textAlign: 'center',
              fontSize: '4rem',
              marginBottom: '2rem',
              opacity: 0.3,
              filter: 'grayscale(100%)'
            }}>
              🎪🎨👥👥👥🎭🖼️👥👥👥🎪
            </div>

            {/* Digital Overlays */}
            <div style={{
              position: 'absolute',
              top: '20%',
              left: '15%',
              animation: 'float 3s ease-in-out infinite'
            }}>
              <div style={{
                backgroundColor: '#e74c3c',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
              }}>
                📍 AR Marker
              </div>
            </div>

            <div style={{
              position: 'absolute',
              top: '30%',
              right: '20%',
              animation: 'float 3s ease-in-out infinite 1s'
            }}>
              <div style={{
                backgroundColor: '#f39c12',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)'
              }}>
                🔔 Push Notification
              </div>
            </div>

            <div style={{
              position: 'absolute',
              bottom: '30%',
              left: '25%',
              animation: 'float 3s ease-in-out infinite 0.5s'
            }}>
              <div style={{
                backgroundColor: '#27ae60',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(39, 174, 96, 0.4)'
              }}>
                👨‍🎨 Artist Profile
              </div>
            </div>

            <div style={{
              position: 'absolute',
              bottom: '20%',
              right: '15%',
              animation: 'float 3s ease-in-out infinite 1.5s'
            }}>
              <div style={{
                backgroundColor: '#9b59b6',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4)'
              }}>
                📊 Live Analytics
              </div>
            </div>

            {/* Center Digital Layer */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(5, 84, 116, 0.9)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '600',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              🧠 Leo AI Processing
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Zero-Risk Hook */}
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
          {/* Headline */}
          <h2 style={{
            fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '2rem',
            color: '#055474',
            lineHeight: 1.2
          }}>
            Start Free — Get Your Event Seen Everywhere Artists Are Looking
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
              Create a promoter profile and list your event in minutes — <strong>no fees, no contracts.</strong>
            </p>
            
            <p style={{
              fontSize: '1.2rem',
              lineHeight: 1.6,
              color: '#666666',
              marginBottom: '1.5rem'
            }}>
              Every listing is indexed and searchable by thousands of artists actively looking for shows.
            </p>
            
            <p style={{
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: '#666666',
              fontStyle: 'italic'
            }}>
              Even if you do nothing else, another site linking to your event is a win.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center',
            marginBottom: '4rem'
          }}>
            {/* Left - Event Listing Mockup */}
            <div style={{
              position: 'relative'
            }}>
              {/* Browser Window */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px 10px 0 0',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                animation: 'slideInLeft 1s ease-out'
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
                    brakebee.com/events/summer-art-fest-2025
                  </div>
                </div>

                {/* Event Listing Content */}
                <div style={{ padding: '2rem' }}>
                  {/* Event Header */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#055474',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      EVENT LOGO
                    </div>
                    <div>
                      <h3 style={{
                        color: '#055474',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        margin: '0 0 0.5rem 0'
                      }}>
                        Summer Art Festival 2025
                      </h3>
                      <p style={{
                        color: '#666666',
                        fontSize: '1rem',
                        margin: '0'
                      }}>
                        📍 Central Park, NYC • 📅 July 15-17, 2025
                      </p>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#333333',
                      margin: '0 0 0.5rem 0',
                      lineHeight: 1.4
                    }}>
                      <strong>Seeking:</strong> Painters, Sculptors, Digital Artists
                    </p>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#333333',
                      margin: '0 0 0.5rem 0',
                      lineHeight: 1.4
                    }}>
                      <strong>Booth Fee:</strong> $150-300 • <strong>Commission:</strong> 10%
                    </p>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#333333',
                      margin: '0',
                      lineHeight: 1.4
                    }}>
                      <strong>Expected Attendance:</strong> 15,000+ visitors
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem'
                  }}>
                    <button 
                      className={styles.primaryButton}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      Apply Now
                    </button>
                    <button 
                      className={styles.secondaryButton}
                      style={{ 
                        backgroundColor: '#ffffff',
                        color: '#055474',
                        border: '2px solid #055474',
                        padding: '0.5rem 1rem', 
                        fontSize: '0.9rem' 
                      }}
                    >
                      Save Event
                    </button>
                  </div>
                </div>
              </div>

              {/* "Going Live" Animation */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                backgroundColor: '#28a745',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                animation: 'bounce 2s ease-in-out infinite',
                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)'
              }}>
                🟢 LIVE
              </div>
            </div>

            {/* Right - Network Propagation */}
            <div style={{
              position: 'relative',
              height: '400px'
            }}>
              <h3 style={{
                textAlign: 'center',
                marginBottom: '2rem',
                color: '#333333',
                fontSize: '1.3rem'
              }}>
                Your Event Appears Across Our Network
              </h3>

              {/* Central Hub */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100px',
                height: '100px',
                backgroundColor: '#055474',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: '600',
                textAlign: 'center',
                animation: 'pulse 2s ease-in-out infinite',
                zIndex: 2
              }}>
                YOUR EVENT
              </div>

              {/* Artist Profile Nodes */}
              {[
                { top: '10%', left: '20%', delay: '0s', color: '#e74c3c' },
                { top: '15%', right: '15%', delay: '0.5s', color: '#f39c12' },
                { top: '40%', left: '5%', delay: '1s', color: '#27ae60' },
                { top: '60%', right: '5%', delay: '1.5s', color: '#9b59b6' },
                { bottom: '15%', left: '25%', delay: '2s', color: '#3498db' },
                { bottom: '10%', right: '20%', delay: '2.5s', color: '#e67e22' }
              ].map((node, index) => (
                <div key={index}>
                  {/* Connection Line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '2px',
                    height: '100px',
                    backgroundColor: node.color,
                    transformOrigin: 'top center',
                    transform: `translate(-50%, -50%) rotate(${index * 60}deg)`,
                    animation: `drawLine 0.8s ease-out ${node.delay} both`,
                    opacity: 0.6
                  }} />
                  
                  {/* Artist Node */}
                  <div style={{
                    position: 'absolute',
                    ...node,
                    width: '60px',
                    height: '60px',
                    backgroundColor: node.color,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    animation: `popIn 0.5s ease-out ${node.delay} both`,
                    boxShadow: `0 4px 15px ${node.color}40`
                  }}>
                    👨‍🎨<br />Artist
                  </div>
                </div>
              ))}

              {/* Notification Badges */}
              <div style={{
                position: 'absolute',
                top: '5%',
                right: '5%',
                animation: 'slideInRight 1s ease-out 3s both'
              }}>
                <div style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.7rem',
                  fontWeight: '600'
                }}>
                  🔔 6 New Views
                </div>
              </div>

              <div style={{
                position: 'absolute',
                bottom: '5%',
                left: '5%',
                animation: 'slideInLeft 1s ease-out 3.5s both'
              }}>
                <div style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.7rem',
                  fontWeight: '600'
                }}>
                  ✅ 3 Applications
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => window.location.href = '/signup'}
              className={styles.ctaButton}
            >
              Post Your Event Free
            </button>
          </div>
        </div>
      </section>

      {/* Section 3 - The Systems That Run Your Show */}
      <section style={{
        padding: '6rem 0',
        backgroundColor: '#f8f9fa',
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
            marginBottom: '4rem',
            color: '#333333',
            lineHeight: 1.2
          }}>
            Every Tool You Need, <span style={{ color: '#055474' }}>Working Together</span>
          </h2>

          {/* Feature Blocks */}
          <div style={{
            display: 'grid',
            gap: '3rem'
          }}>
            {/* 1. Discovery System */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3rem',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              padding: '3rem',
              borderRadius: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    marginRight: '1rem'
                  }}>🧭</div>
                  <h3 style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: '#055474',
                    margin: 0
                  }}>
                    Discovery System – Promoter Sites
                  </h3>
                </div>
                
                <p style={{
                  fontSize: '1.2rem',
                  lineHeight: 1.6,
                  color: '#333333',
                  marginBottom: '1.5rem'
                }}>
                  Create full event websites in seconds — no developer needed. Each event can have its own domain for powerful SEO, auto-pulled artist profiles, and even affiliate art sales that earn you revenue.
                </p>
              </div>

              {/* Promoter Site Mockup */}
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
                  {/* Site Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
                    color: 'white',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <h4 style={{
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      margin: '0 0 0.5rem 0'
                    }}>
                      Summer Art Festival 2025
                    </h4>
                    <p style={{
                      fontSize: '0.9rem',
                      margin: 0,
                      opacity: 0.9
                    }}>
                      summerartfest2025.com
                    </p>
                  </div>

                  {/* Artist Profiles Grid */}
                  <div style={{
                    padding: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem'
                  }}>
                    {[
                      { name: 'Sarah Chen', type: 'Painter', color: '#e74c3c' },
                      { name: 'Mike Torres', type: 'Sculptor', color: '#f39c12' },
                      { name: 'Lisa Park', type: 'Digital Artist', color: '#27ae60' },
                      { name: 'David Kim', type: 'Photographer', color: '#9b59b6' }
                    ].map((artist, index) => (
                      <div key={index} style={{
                        backgroundColor: '#f8f9fa',
                        padding: '1rem',
                        borderRadius: '8px',
                        animation: `fadeInUp 0.5s ease-out ${0.2 + index * 0.1}s both`
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: artist.color,
                          borderRadius: '50%',
                          marginBottom: '0.5rem'
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
                          style={{ 
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.7rem'
                          }}
                        >
                          Shop Artist Work
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  animation: 'pulse 2s ease-in-out infinite',
                  boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)'
                }}>
                  💰 Earning Revenue
                </div>
              </div>
            </div>

            {/* 2. Application System */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3rem',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              padding: '3rem',
              borderRadius: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              {/* Application Flow Animation */}
              <div style={{
                position: 'relative',
                height: '300px'
              }}>
                <h4 style={{
                  textAlign: 'center',
                  marginBottom: '2rem',
                  color: '#333333',
                  fontSize: '1.1rem'
                }}>
                  Application → Acceptance → Live Profile
                </h4>

                {/* Step 1: Application */}
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#3498db',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  animation: 'slideInLeft 1s ease-out'
                }}>
                  📝<br />Application<br />Submitted
                </div>

                {/* Arrow 1 */}
                <div style={{
                  position: 'absolute',
                  left: '25%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '2rem',
                  color: '#055474',
                  animation: 'slideInLeft 1s ease-out 0.5s both'
                }}>
                  →
                </div>

                {/* Step 2: Review */}
                <div style={{
                  position: 'absolute',
                  left: '35%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#f39c12',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  animation: 'slideInLeft 1s ease-out 1s both'
                }}>
                  ⚖️<br />Jury<br />Review
                </div>

                {/* Arrow 2 */}
                <div style={{
                  position: 'absolute',
                  right: '25%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '2rem',
                  color: '#055474',
                  animation: 'slideInLeft 1s ease-out 1.5s both'
                }}>
                  →
                </div>

                {/* Step 3: Accepted */}
                <div style={{
                  position: 'absolute',
                  right: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  animation: 'slideInLeft 1s ease-out 2s both'
                }}>
                  ✅<br />Auto-Listed<br />on Site
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
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  animation: 'fadeInUp 1s ease-out 2.5s both'
                }}>
                  Only 5% of collected fees
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    marginRight: '1rem'
                  }}>📝</div>
                  <h3 style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: '#055474',
                    margin: 0
                  }}>
                    Application System – Jury & Booth Management
                  </h3>
                </div>
                
                <p style={{
                  fontSize: '1.2rem',
                  lineHeight: 1.6,
                  color: '#333333',
                  marginBottom: '1.5rem'
                }}>
                  Streamline applications, jurying, and payments. Artists are automatically listed on your event page once accepted. Transparent pricing: 5% of collected fees (includes credit card costs).
                </p>
              </div>
            </div>

            {/* 3. Talent System */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3rem',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              padding: '3rem',
              borderRadius: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    marginRight: '1rem'
                  }}>🎨</div>
                  <h3 style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: '#055474',
                    margin: 0
                  }}>
                    Talent System – VIP Recruitment
                  </h3>
                </div>
                
                <p style={{
                  fontSize: '1.2rem',
                  lineHeight: 1.6,
                  color: '#333333',
                  marginBottom: '1.5rem'
                }}>
                  Invite artists directly with one click. Waive jury or booth fees to attract fresh talent and boost event quality without the legwork.
                </p>
              </div>

              {/* VIP Invite Animation */}
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
                  padding: '1.5rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  animation: 'slideInLeft 1s ease-out'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👑</div>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    margin: '0 0 0.5rem 0'
                  }}>
                    VIP Invite Sent
                  </h4>
                  <p style={{
                    fontSize: '0.8rem',
                    margin: 0,
                    opacity: 0.9
                  }}>
                    To: Sarah Chen<br />
                    Waived: Jury Fee
                  </p>
                </div>

                {/* Arrow */}
                <div style={{
                  fontSize: '2rem',
                  color: '#055474',
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  →
                </div>

                {/* Artist Accepts */}
                <div style={{
                  backgroundColor: '#27ae60',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  animation: 'slideInRight 1s ease-out 1s both'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    margin: '0 0 0.5rem 0'
                  }}>
                    Instantly Accepted
                  </h4>
                  <p style={{
                    fontSize: '0.8rem',
                    margin: 0,
                    opacity: 0.9
                  }}>
                    Sarah Chen<br />
                    Added to Event
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Audience System */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3rem',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              padding: '3rem',
              borderRadius: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              {/* Email Campaign Builder */}
              <div style={{
                position: 'relative'
              }}>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  animation: 'slideInLeft 1s ease-out'
                }}>
                  <h4 style={{
                    color: '#055474',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    marginBottom: '1rem'
                  }}>
                    📧 Email Campaign Builder
                  </h4>

                  {/* Campaign Options */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '2px solid #055474',
                      fontSize: '0.9rem'
                    }}>
                      ✅ Your Artist List (1,247 contacts)
                    </div>
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem'
                    }}>
                      📍 Regional Artists (15,000+ in NY)
                    </div>
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem'
                    }}>
                      🎨 Art Lovers Network (50,000+)
                    </div>
                  </div>

                  <button 
                    className={styles.primaryButton}
                    style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.9rem',
                      width: '100%'
                    }}
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
                  borderRadius: '10px',
                  padding: '1rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  animation: 'slideInRight 1s ease-out 1s both'
                }}>
                  <h5 style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    margin: '0 0 0.5rem 0',
                    color: '#333333'
                  }}>
                    Reach Heatmap
                  </h5>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.25rem'
                  }}>
                    {[
                      '#ff4444', '#ff6666', '#ff8888',
                      '#ff6666', '#ff2222', '#ff4444',
                      '#ff8888', '#ff4444', '#ff6666'
                    ].map((color, index) => (
                      <div key={index} style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: color,
                        borderRadius: '2px',
                        animation: `fadeInUp 0.3s ease-out ${1.5 + index * 0.1}s both`
                      }} />
                    ))}
                  </div>
                  <p style={{
                    fontSize: '0.7rem',
                    color: '#666666',
                    margin: '0.5rem 0 0 0'
                  }}>
                    66,247 reached
                  </p>
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    marginRight: '1rem'
                  }}>📣</div>
                  <h3 style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: '#055474',
                    margin: 0
                  }}>
                    Audience System – Email Marketing
                  </h3>
                </div>
                
                <p style={{
                  fontSize: '1.2rem',
                  lineHeight: 1.6,
                  color: '#333333',
                  marginBottom: '1.5rem'
                }}>
                  Send announcements to your own list or pay to reach thousands of artists and art lovers — targeted by region or state. Promote deadlines, boost attendance, and keep your show top of mind.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 - Powered by Leo Art AI */}
      <section style={{
        padding: '6rem 0',
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* AI Circuit Background */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23055474' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3Cpath d='M30 10v20M30 30v20M10 30h20M30 30h20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: 'float 20s ease-in-out infinite'
        }} />

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative'
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
            Meet Leo — <span style={{ color: '#055474' }}>The Brain Behind Brakebee</span>
          </h2>

          {/* Copy */}
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
              Behind the scenes, Brakebee is powered by <strong style={{ color: '#055474' }}>Leo Art AI</strong>, your intelligent co-pilot. Leo continuously learns from artist behavior, event performance, and community trends to make your show smarter every day.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            {/* Left - AI Features */}
            <div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem'
              }}>
                {[
                  { icon: '🎨', text: 'Smart artist recommendations based on your show\'s history.', color: '#e74c3c', delay: '0s' },
                  { icon: '📊', text: 'Predictive booth-filling tools that help you hit capacity faster.', color: '#f39c12', delay: '0.3s' },
                  { icon: '📈', text: 'Region-specific promotion suggestions to maximize reach.', color: '#27ae60', delay: '0.6s' },
                  { icon: '🧠', text: 'Personalized attendee experiences delivered through the upcoming mobile app.', color: '#9b59b6', delay: '0.9s' }
                ].map((feature, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${feature.color}`,
                    animation: `slideInLeft 0.8s ease-out ${feature.delay} both`
                  }}>
                    <div style={{
                      fontSize: '2rem',
                      flexShrink: 0
                    }}>
                      {feature.icon}
                    </div>
                    <p style={{
                      fontSize: '1.1rem',
                      lineHeight: 1.5,
                      color: '#333333',
                      margin: 0
                    }}>
                      {feature.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - AI Brain Animation */}
            <div style={{
              position: 'relative',
              height: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Central Leo Brain */}
              <div style={{
                position: 'absolute',
                width: '150px',
                height: '150px',
                background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '3rem',
                animation: 'pulse 3s ease-in-out infinite',
                boxShadow: '0 0 30px rgba(5, 84, 116, 0.3)',
                zIndex: 2
              }}>
                🧠
              </div>

              {/* Leo Badge */}
              <div style={{
                position: 'absolute',
                top: '30%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                backgroundColor: '#ffffff',
                color: '#055474',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                animation: 'fadeInUp 1s ease-out 1s both'
              }}>
                Leo Art AI
              </div>

              {/* Data Streams */}
              {[
                { angle: 0, color: '#e74c3c', label: 'Artist Data', delay: '0.5s' },
                { angle: 72, color: '#f39c12', label: 'Event Metrics', delay: '1s' },
                { angle: 144, color: '#27ae60', label: 'Trends', delay: '1.5s' },
                { angle: 216, color: '#3498db', label: 'Behavior', delay: '2s' },
                { angle: 288, color: '#9b59b6', label: 'Performance', delay: '2.5s' }
              ].map((stream, index) => (
                <div key={index}>
                  {/* Data Stream Line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '3px',
                    height: '120px',
                    backgroundColor: stream.color,
                    transformOrigin: 'top center',
                    transform: `translate(-50%, -50%) rotate(${stream.angle}deg)`,
                    animation: `drawLine 1s ease-out ${stream.delay} both`,
                    opacity: 0.7
                  }} />
                  
                  {/* Data Node */}
                  <div style={{
                    position: 'absolute',
                    top: `${50 + 35 * Math.sin(stream.angle * Math.PI / 180)}%`,
                    left: `${50 + 35 * Math.cos(stream.angle * Math.PI / 180)}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '80px',
                    height: '60px',
                    backgroundColor: stream.color,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    animation: `popIn 0.6s ease-out ${stream.delay} both`,
                    boxShadow: `0 4px 15px ${stream.color}40`
                  }}>
                    {stream.label}
                  </div>
                </div>
              ))}

              {/* Insight Outputs */}
              <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '20%',
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
                right: '20%',
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                animation: 'slideInUp 1s ease-out 3.5s both',
                boxShadow: '0 4px 15px rgba(220, 53, 69, 0.4)'
              }}>
                🎯 Recommendations
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 - The Future of Art Festivals */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
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
            This Is Just <span style={{ color: '#055474' }}>the Beginning</span>
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
              Our roadmap is already in motion — and <strong>early promoters will unlock future tools free.</strong>
            </p>
          </div>

          {/* Roadmap Timeline */}
          <div style={{
            position: 'relative',
            padding: '2rem 0'
          }}>
            {/* Timeline Line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '10%',
              right: '10%',
              height: '4px',
              background: 'linear-gradient(90deg, #055474 0%, #3e1c56 100%)',
              borderRadius: '2px',
              animation: 'drawLineHorizontal 2s ease-out'
            }} />

            {/* Roadmap Items */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              position: 'relative'
            }}>
              {[
                {
                  title: 'Mobile App (2026)',
                  icon: '📍',
                  description: 'Augmented reality guides, geofenced push notifications, and digital overlays that enhance attendee experience.',
                  color: '#e74c3c',
                  delay: '0.5s'
                },
                {
                  title: 'Post-Event Marketplace',
                  icon: '🛍️',
                  description: 'Attendees keep shopping after the show ends, driving ongoing sales for artists and commissions for promoters.',
                  color: '#f39c12',
                  delay: '1s'
                },
                {
                  title: 'Smart Attendee Tools',
                  icon: '🧠',
                  description: 'Personalized recommendations and real-time offers to boost engagement and revenue.',
                  color: '#27ae60',
                  delay: '1.5s'
                }
              ].map((item, index) => (
                <div key={index} style={{
                  backgroundColor: '#ffffff',
                  padding: '2rem',
                  borderRadius: '15px',
                  textAlign: 'center',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  animation: `fadeInUp 0.8s ease-out ${item.delay} both`,
                  position: 'relative'
                }}>
                  {/* Timeline Dot */}
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '30px',
                    height: '30px',
                    backgroundColor: item.color,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: `0 4px 15px ${item.color}40`
                  }}>
                    {index + 1}
                  </div>

                  <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem'
                  }}>
                    {item.icon}
                  </div>

                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    color: '#055474',
                    marginBottom: '1rem'
                  }}>
                    {item.title}
                  </h3>

                  <p style={{
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    color: '#666666',
                    margin: 0
                  }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Early Access Badge */}
          <div style={{
            textAlign: 'center',
            marginTop: '3rem'
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#28a745',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '25px',
              fontSize: '1.1rem',
              fontWeight: '600',
              animation: 'pulse 2s ease-in-out infinite',
              boxShadow: '0 6px 20px rgba(40, 167, 69, 0.3)'
            }}>
              🎉 Early promoters get these features FREE when they launch!
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Join the Next Generation */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Orbiting Modules Background */}
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

          {/* Orbiting Modules */}
          {[
            { name: 'Discovery', angle: 0, radius: 200, speed: '20s' },
            { name: 'Applications', angle: 90, radius: 180, speed: '25s' },
            { name: 'Talent', angle: 180, radius: 220, speed: '30s' },
            { name: 'Audience', angle: 270, radius: 190, speed: '22s' }
          ].map((module, index) => (
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
              animation: `orbit${index + 1} ${module.speed} linear infinite`,
              transformOrigin: `0 0`
            }}>
              {module.name}
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
            animation: 'fadeInUp 1s ease-out',
            color: '#ffffff',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            The Future of Art Festivals Runs on Brakebee.
          </h2>

          {/* Subhead */}
          <p style={{
            fontSize: '1.5rem',
            marginBottom: '3rem',
            opacity: 0.9,
            animation: 'fadeInUp 1s ease-out 0.3s both'
          }}>
            Start free today. Grow with Leo. Build the show you've always wanted.
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
              onClick={() => window.location.href = '/signup'}
              className={styles.ctaButton}
              style={{ 
                backgroundColor: '#ffd700',
                color: '#333333'
              }}
            >
              🟡 Post Your Event Free
            </button>

            <button
              onClick={() => setShowVideoModal(true)}
              className={styles.ctaButton}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '3px solid white'
              }}
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

        @keyframes typewriter {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes orbit1 {
          0% {
            transform: rotate(0deg) translateX(150px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(150px) rotate(-360deg);
          }
        }

        @keyframes orbit2 {
          0% {
            transform: rotate(120deg) translateX(180px) rotate(-120deg);
          }
          100% {
            transform: rotate(480deg) translateX(180px) rotate(-480deg);
          }
        }

        @keyframes orbit3 {
          0% {
            transform: rotate(240deg) translateX(160px) rotate(-240deg);
          }
          100% {
            transform: rotate(600deg) translateX(160px) rotate(-600deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.1);
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0) rotate(var(--rotation, 0deg));
          }
          25% {
            transform: translateX(-2px) rotate(var(--rotation, 0deg));
          }
          75% {
            transform: translateX(2px) rotate(var(--rotation, 0deg));
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
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
            transform: scale(0);
          }
          80% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
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

            @keyframes drawLineHorizontal {
              from {
                width: 0;
              }
              to {
                width: 80%;
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

            @media (max-width: 768px) {
              /* Hero Section Mobile */
              section:first-of-type > div {
                grid-template-columns: 1fr !important;
                gap: 2rem !important;
                text-align: center;
              }
              
              section:first-of-type > div > div:last-child {
                height: 300px !important;
                order: -1;
              }

              /* Systems Section Mobile */
              section > div > div > div[style*="grid-template-columns: 1fr 1fr"] {
                grid-template-columns: 1fr !important;
                gap: 2rem !important;
                text-align: center;
              }

              /* Timeline Section Mobile */
              section > div > div > div[style*="grid-template-columns: repeat(3, 1fr)"] {
                grid-template-columns: 1fr !important;
                gap: 2rem !important;
              }

              /* AI Brain Animation Mobile - Hide complex animations */
              div[style*="height: 500px"] {
                height: 200px !important;
              }

              /* Hide orbiting elements on mobile */
              div[style*="orbit1"], div[style*="orbit2"], div[style*="orbit3"] {
                display: none !important;
              }

              /* Simplify Leo AI data streams on mobile */
              div[style*="rotate("] {
                display: none !important;
              }

              /* Mobile-friendly button layout */
              div[style*="display: flex"][style*="gap: 2rem"] {
                flex-direction: column !important;
                align-items: center !important;
                gap: 1rem !important;
              }

              /* Mobile button sizing */
              button {
                width: 100% !important;
                max-width: 280px !important;
                padding: 1rem 2rem !important;
                font-size: 1.1rem !important;
              }

              /* Mobile text sizing */
              h1, h2 {
                font-size: clamp(1.8rem, 6vw, 2.5rem) !important;
              }

              h3 {
                font-size: 1.3rem !important;
              }

              p {
                font-size: 1rem !important;
              }

              /* Mobile spacing */
              section {
                padding: 3rem 0 !important;
              }

              /* Hide complex background animations on mobile */
              div[style*="position: absolute"][style*="animation"] {
                display: none !important;
              }

              /* Keep only essential animations */
              div[style*="Central Leo Brain"] {
                position: relative !important;
                margin: 2rem auto !important;
              }

              /* Mobile-friendly feature cards */
              div[style*="borderLeft"] {
                border-left: none !important;
                border-top: 4px solid !important;
                text-align: center !important;
              }

              /* Mobile timeline adjustments */
              div[style*="Timeline Line"] {
                display: none !important;
              }

              div[style*="Timeline Dot"] {
                position: relative !important;
                top: auto !important;
                left: auto !important;
                transform: none !important;
                margin: 0 auto 1rem auto !important;
              }

              /* Zero-Risk Hook Section - Event Listing + Network Animation */
              section div[style*="display: grid"][style*="gridTemplateColumns: 1fr 1fr"][style*="gap: 4rem"] {
                grid-template-columns: 1fr !important;
                gap: 2rem !important;
              }

              /* Network Animation Mobile - Simplify */
              div[style*="height: 400px"] {
                height: 300px !important;
              }

              /* Hide complex network nodes on mobile */
              div[style*="position: absolute"][style*="animation: popIn"] {
                display: none !important;
              }

              /* Hide connection lines on mobile */
              div[style*="position: absolute"][style*="animation: drawLine"] {
                display: none !important;
              }

              /* Keep only central hub and notification badges */
              div[style*="YOUR EVENT"] {
                position: relative !important;
                top: auto !important;
                left: auto !important;
                transform: none !important;
                margin: 2rem auto !important;
              }

              /* Mobile notification badges - reposition */
              div[style*="slideInRight 1s ease-out 3s both"],
              div[style*="slideInLeft 1s ease-out 3.5s both"] {
                position: relative !important;
                top: auto !important;
                right: auto !important;
                left: auto !important;
                bottom: auto !important;
                margin: 1rem auto !important;
                text-align: center !important;
              }
            }
          `}</style>
    </PromoterLanding>
  );
}
