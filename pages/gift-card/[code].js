/**
 * Printable Gift Card Page
 * Renders a beautiful gift card that can be printed to PDF
 */
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { authApiRequest } from '../../lib/apiUtils';

export default function PrintableGiftCard() {
  const router = useRouter();
  const { code } = router.query;
  const [giftCard, setGiftCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    
    const fetchGiftCard = async () => {
      try {
        // Try authenticated endpoint first, fall back to public
        let response;
        try {
          response = await authApiRequest(`credits/gift-card/${code}`);
        } catch {
          // Fetch from public endpoint if not logged in
          response = await fetch(`/api/credits/gift-card/${code}`);
        }
        
        if (response.ok) {
          const data = await response.json();
          setGiftCard(data);
        } else {
          setError('Gift card not found');
        }
      } catch (err) {
        setError('Unable to load gift card');
      } finally {
        setLoading(false);
      }
    };

    fetchGiftCard();
  }, [code]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        Loading gift card...
      </div>
    );
  }

  if (error || !giftCard) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎁</div>
        <h1 style={{ margin: '0 0 8px 0' }}>Gift Card Not Found</h1>
        <p style={{ color: '#6c757d' }}>This gift card code is invalid or has expired.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Brakebee Gift Card - {formatCurrency(giftCard.original_amount)}</title>
        <style>{`
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-container { 
              box-shadow: none !important;
              margin: 0 !important;
            }
          }
          @page {
            size: landscape;
            margin: 0.5in;
          }
        `}</style>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#f0f0f0',
        padding: '20px',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Print Button */}
        <div className="no-print" style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => window.print()}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🖨️ Print Gift Card
          </button>
        </div>

        {/* Gift Card */}
        <div 
          className="print-container"
          style={{
            width: '800px',
            height: '400px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden',
            color: 'white'
          }}
        >
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.5
          }} />

          {/* Content */}
          <div style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '700',
                  letterSpacing: '-0.5px'
                }}>
                  BRAKEBEE
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  opacity: 0.8,
                  marginTop: '4px'
                }}>
                  Handmade Art Marketplace
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                GIFT CARD
              </div>
            </div>

            {/* Main Content */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  opacity: 0.8,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  Gift Card Value
                </div>
                <div style={{ 
                  fontSize: '72px', 
                  fontWeight: '700',
                  lineHeight: 1,
                  letterSpacing: '-2px'
                }}>
                  {formatCurrency(giftCard.original_amount)}
                </div>
                {giftCard.recipient_name && (
                  <div style={{ 
                    marginTop: '16px',
                    fontSize: '16px',
                    opacity: 0.9
                  }}>
                    For: <strong>{giftCard.recipient_name}</strong>
                  </div>
                )}
                {giftCard.sender_name && (
                  <div style={{ 
                    fontSize: '14px',
                    opacity: 0.8
                  }}>
                    From: {giftCard.sender_name}
                  </div>
                )}
              </div>

              {/* Gift Icon */}
              <div style={{
                fontSize: '120px',
                opacity: 0.3
              }}>
                🎁
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end'
            }}>
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  opacity: 0.7,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Redemption Code
                </div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '600',
                  fontFamily: 'monospace',
                  letterSpacing: '3px',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '8px'
                }}>
                  {giftCard.code}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', opacity: 0.7 }}>
                {giftCard.expires_at && (
                  <div>Expires: {formatDate(giftCard.expires_at)}</div>
                )}
                <div>Redeem at brakebee.com</div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Message (if exists) */}
        {giftCard.personal_message && (
          <div 
            className="print-container"
            style={{
              width: '800px',
              marginTop: '24px',
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Personal Message
            </div>
            <div style={{ 
              fontSize: '18px', 
              lineHeight: 1.6,
              fontStyle: 'italic',
              color: '#333'
            }}>
              "{giftCard.personal_message}"
            </div>
            {giftCard.sender_name && (
              <div style={{
                marginTop: '16px',
                textAlign: 'right',
                color: '#667eea',
                fontWeight: '500'
              }}>
                — {giftCard.sender_name}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div 
          className="no-print"
          style={{
            width: '800px',
            marginTop: '24px',
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>How to Redeem</h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#555' }}>
            <li style={{ marginBottom: '8px' }}>Create an account or sign in at <a href="https://brakebee.com" style={{ color: '#667eea' }}>brakebee.com</a></li>
            <li style={{ marginBottom: '8px' }}>Go to Dashboard → My Account → My Wallet</li>
            <li style={{ marginBottom: '8px' }}>Enter the redemption code above</li>
            <li>Use your credit at checkout!</li>
          </ol>
        </div>
      </div>
    </>
  );
}
