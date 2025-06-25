'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import LoginModal from '../components/LoginModal';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [heroData, setHeroData] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    loadHeroData();
  }, []);

  const loadHeroData = async () => {
    try {
      const res = await fetch('/static_media/hero.json');
      if (res.ok) {
        const data = await res.json();
        setHeroData(data);
      }
    } catch (err) {
      console.log('No hero data found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoEnd = () => {
    if (heroData && heroData.videos.length > 1) {
      setCurrentVideoIndex((prev) => (prev + 1) % heroData.videos.length);
    }
  };

  const handleHeroButtonClick = () => {
    if (heroData && heroData.buttonUrl) {
      router.push(heroData.buttonUrl);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      
      {/* Hero Section */}
      {heroData && heroData.videos.length > 0 && (
        <section style={{ 
          position: 'relative', 
          height: '100vh', 
          overflow: 'hidden',
          backgroundColor: '#000'
        }}>
          {/* Video Background */}
          <video 
            key={heroData.videos[currentVideoIndex]?.id}
            autoPlay 
            muted 
            onEnded={handleVideoEnd}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <source src={`/static_media/${heroData.videos[currentVideoIndex]?.filename}`} type="video/mp4" />
          </video>

          {/* Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ maxWidth: '800px', padding: '2rem' }}>
              {heroData.h1Text && (
                <h1 style={{ 
                  fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                  marginBottom: '1rem', 
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                  lineHeight: 1.2
                }}>
                  {heroData.h1Text}
                </h1>
              )}
              {heroData.h3Text && (
                <h3 style={{ 
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)', 
                  marginBottom: '2rem',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                  lineHeight: 1.4
                }}>
                  {heroData.h3Text}
                </h3>
              )}
              {heroData.buttonText && (
                <button 
                  onClick={handleHeroButtonClick}
                  style={{
                    padding: '1rem 2.5rem',
                    backgroundColor: '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#044a63';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#055474';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                >
                  {heroData.buttonText}
                </button>
              )}
            </div>
          </div>

          {/* Video Progress Indicator */}
          {heroData.videos.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '0.5rem'
            }}>
              {heroData.videos.map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: index === currentVideoIndex ? '#055474' : 'rgba(255,255,255,0.5)',
                    transition: 'background-color 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Fallback Content */}
      {(!heroData || heroData.videos.length === 0) && (
        <div style={{ padding: '2rem' }}>
          {isLoggedIn ? (
            <div>
              <h1>Welcome Back!</h1>
              <p>You are logged in. Visit your <a href="/dashboard">dashboard</a> to continue.</p>
            </div>
          ) : (
            <div>
              <h1>Welcome to Online Art Festival</h1>
              <p>Login to access your dashboard.</p>
              <LoginModal />
            </div>
          )}
        </div>
      )}
    </div>
  );
}