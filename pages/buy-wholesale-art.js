import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getApiUrl, getFrontendUrl } from '../lib/config';
import { getAuthToken } from '../lib/auth/tokens';

const WHOLESALE_APP_PATH = '/dashboard/account/wholesale-application';

const FAQ_ITEMS = [
  {
    question: 'What types of businesses qualify for wholesale pricing?',
    answer: 'Any business that purchases art for resale or commercial use can apply. This includes retail stores, boutiques, art galleries, interior design firms, hospitality businesses, corporate offices, e-commerce resellers, and event planners. You will need a valid business entity and, in most cases, a resale certificate.'
  },
  {
    question: 'What is the minimum order for wholesale art?',
    answer: 'Minimum order requirements vary by artist and product category. Many artists offer wholesale pricing starting at modest quantities, making it accessible for small boutiques and independent shops alongside larger retail operations.'
  },
  {
    question: 'How does wholesale pricing work on Brakebee?',
    answer: 'Once approved as a wholesale buyer, you unlock tiered pricing directly on product pages. Wholesale prices are set by each artist and typically represent significant savings over retail. The more you order, the better the pricing — volume discounts are built into the tier structure.'
  },
  {
    question: 'Can I return wholesale art orders?',
    answer: 'Wholesale orders are subject to our standard return policy with some additional terms outlined in the wholesale agreement. Damaged or defective items are always covered. Please review the wholesale terms during the application process for complete details.'
  },
  {
    question: 'How do I become an approved wholesale buyer?',
    answer: 'Click "Apply Now" on this page to start the free application. You will provide basic business information, your resale certificate, and details about your purchasing needs. Applications are typically reviewed within 2 to 3 business days.'
  },
  {
    question: 'What art mediums are available at wholesale?',
    answer: 'Brakebee artists offer wholesale pricing across a wide range of mediums including original paintings, limited edition prints, photography, sculpture, ceramics, textiles, jewelry, mixed media, and digital art. New artists and categories are added regularly.'
  }
];

const AUDIENCE_SEGMENTS = [
  {
    title: 'Retail Stores & Boutiques',
    description: 'Stock your shelves with original artwork and handcrafted pieces that set your store apart from mass-market competitors. Curated art drives foot traffic, increases average order value, and builds a loyal customer base.',
    icon: '🏪'
  },
  {
    title: 'Interior Designers',
    description: 'Source unique, high-quality artwork for residential and commercial projects. Access a diverse catalog of original pieces across styles and mediums — from contemporary abstracts to traditional landscapes — all at wholesale pricing.',
    icon: '🎨'
  },
  {
    title: 'Hospitality & Restaurants',
    description: 'Transform guest experiences with curated art collections for hotels, restaurants, bars, and resorts. Original artwork creates memorable spaces that earn reviews and repeat visits.',
    icon: '🏨'
  },
  {
    title: 'Corporate Offices',
    description: 'Elevate your workplace with art that inspires creativity and reflects your brand values. Wholesale pricing makes it practical to outfit entire offices, lobbies, and conference rooms with original pieces.',
    icon: '🏢'
  },
  {
    title: 'Art Galleries',
    description: 'Discover emerging and established independent artists to represent in your gallery. Wholesale pricing gives you the margin you need, while our curated marketplace ensures quality and authenticity.',
    icon: '🖼️'
  },
  {
    title: 'E-Commerce Resellers',
    description: 'Build or expand your online art business with access to verified, independent artists. Wholesale pricing, high-resolution imagery, and artist provenance documentation make reselling seamless.',
    icon: '🛒'
  }
];

const CATEGORIES = [
  'Original Paintings', 'Limited Edition Prints', 'Photography',
  'Sculpture', 'Ceramics & Pottery', 'Textiles & Fiber Art',
  'Jewelry & Wearable Art', 'Mixed Media', 'Digital Art', 'Illustration'
];

export default function BuyWholesaleArt() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [articles, setArticles] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    setIsLoggedIn(!!token);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    fetchWholesaleArticles();
  }, []);

  const fetchWholesaleArticles = async () => {
    try {
      const res = await fetch(getApiUrl('api/v2/content/articles/topics/wholesale'));
      if (!res.ok) return;
      const data = await res.json();
      const payload = data.data || data;
      if (payload.topic?.recent_articles?.length) {
        setArticles(payload.topic.recent_articles);
      }
    } catch {
      // Wholesale articles not available yet
    }
  };

  const ctaUrl = isLoggedIn
    ? WHOLESALE_APP_PATH
    : `/signup?redirect=${encodeURIComponent(WHOLESALE_APP_PATH)}`;

  const ctaLabel = isLoggedIn ? 'Apply Now' : 'Create Account & Apply';

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Buy Wholesale Art | Brakebee',
    description: 'Buy wholesale art directly from independent artists. Exclusive pricing for retailers, interior designers, galleries, and businesses.',
    url: getFrontendUrl('buy-wholesale-art'),
    publisher: {
      '@type': 'Organization',
      name: 'Brakebee',
      url: getFrontendUrl('')
    }
  };

  const sectionStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem'
  };

  return (
    <>
      <Head>
        <title key="title">Buy Wholesale Art | Wholesale Artwork for Businesses | Brakebee</title>
        <meta key="description" name="description" content="Buy wholesale art directly from verified independent artists on Brakebee. Exclusive wholesale pricing for retail stores, interior designers, galleries, hospitality, and corporate buyers. Apply free today." />
        <meta key="keywords" name="keywords" content="wholesale art, buy art wholesale, wholesale artwork, wholesale paintings, wholesale prints, art for retail stores, art for interior designers, wholesale art marketplace, bulk art buying, art for hospitality, art for restaurants, wholesale sculpture, art for galleries" />
        <link rel="canonical" href={getFrontendUrl('buy-wholesale-art')} />
        <meta key="og:title" property="og:title" content="Buy Wholesale Art Directly from Independent Artists | Brakebee" />
        <meta key="og:description" property="og:description" content="Exclusive wholesale pricing on original artwork. Source paintings, prints, sculpture, and more directly from curated, verified artists." />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:url" property="og:url" content={getFrontendUrl('buy-wholesale-art')} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Buy Wholesale Art | Brakebee" />
        <meta name="twitter:description" content="Wholesale pricing on original artwork from verified independent artists. Apply free." />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Head>

      <main>
        {/* ===== HERO ===== */}
        <section style={{
          background: 'var(--gradient-primary)',
          color: 'white',
          padding: '6rem 0 5rem',
          textAlign: 'center'
        }}>
          <div style={sectionStyle}>
            <h1 style={{
              color: 'white',
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              lineHeight: 1.2,
              marginBottom: '1.5rem'
            }}>
              Buy Wholesale Art Directly from Independent Artists
            </h1>
            <p style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.3rem)',
              lineHeight: 1.7,
              maxWidth: '750px',
              margin: '0 auto 2.5rem',
              opacity: 0.92
            }}>
              Brakebee connects retailers, designers, and businesses with a curated marketplace
              of verified artists. No middlemen. No markups. Just original artwork at wholesale pricing.
            </p>
            {authChecked && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="large" onClick={() => { window.location.href = ctaUrl; }}>
                  {ctaLabel}
                </button>
                <button className="outline large" style={{ borderColor: 'white', color: 'white' }}
                  onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  Learn How It Works
                </button>
              </div>
            )}
            <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.75 }}>
              Free to apply &bull; No commitment &bull; Verified artists only
            </p>
          </div>
        </section>

        {/* ===== WHO BUYS WHOLESALE ART ===== */}
        <section style={{ padding: '5rem 0', background: '#f9fafb' }}>
          <div style={sectionStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Who Buys Wholesale Art?</h2>
            <p style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem', color: '#555', lineHeight: 1.6 }}>
              From independent boutiques to national hospitality chains, businesses of all sizes
              source original artwork through Brakebee&apos;s wholesale program.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.5rem'
            }}>
              {AUDIENCE_SEGMENTS.map((segment) => (
                <div key={segment.title} style={{
                  background: 'white',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '2rem',
                  boxShadow: 'var(--shadow-soft)',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-medium)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-soft)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{segment.icon}</div>
                  <h3 style={{ marginBottom: '0.5rem' }}>{segment.title}</h3>
                  <p style={{ color: '#555', lineHeight: 1.6, margin: 0 }}>{segment.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHY BRAKEBEE WHOLESALE ===== */}
        <section style={{ padding: '5rem 0' }}>
          <div style={sectionStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Why Source Art Through Brakebee?</h2>
            <p style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem', color: '#555', lineHeight: 1.6 }}>
              Brakebee is the only wholesale art marketplace that connects you directly with
              curated, verified independent artists — cutting out distributors and markups entirely.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem'
            }}>
              {[
                { title: 'Direct-from-Artist Pricing', desc: 'No distributor markups, no gallery commissions. Wholesale prices are set directly by each artist, giving you better margins and them fair pay.' },
                { title: 'Curated & Verified Artists', desc: 'Every artist on Brakebee is vetted through our application process. You are buying from real, verified creators — not dropshippers or print farms.' },
                { title: 'Wide Range of Mediums', desc: 'Source paintings, prints, photography, sculpture, ceramics, textiles, jewelry, mixed media, and more — all from one marketplace.' },
                { title: 'Flexible Order Volumes', desc: 'Whether you need a single statement piece for a lobby or 200 prints for a hotel chain, our artists accommodate orders of all sizes.' },
                { title: 'Built-in Provenance', desc: 'Every piece comes with artist documentation and authenticity. Your customers and clients get the story behind the art.' },
                { title: 'Dedicated Wholesale Support', desc: 'Our team helps you navigate large orders, custom requests, and artist coordination. You are not just buying from a catalog.' }
              ].map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '40px', minWidth: '40px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold', fontSize: '1.1rem'
                  }}>✓</div>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem' }}>{item.title}</h3>
                    <p style={{ color: '#555', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how-it-works" style={{ padding: '5rem 0', background: '#f9fafb' }}>
          <div style={sectionStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>How Wholesale Buying Works</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '2rem',
              textAlign: 'center'
            }}>
              {[
                { step: '1', title: 'Apply for Free', desc: 'Complete a quick application with your business details and resale certificate. No fees, no commitments.' },
                { step: '2', title: 'Get Approved', desc: 'Our team reviews your application within 2-3 business days. Once approved, wholesale pricing unlocks on your account.' },
                { step: '3', title: 'Start Buying', desc: 'Browse the marketplace with wholesale pricing visible on every product. Place orders, manage your account, and reorder with ease.' }
              ].map((item) => (
                <div key={item.step} style={{
                  background: 'white',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '2.5rem 2rem',
                  boxShadow: 'var(--shadow-soft)'
                }}>
                  <div style={{
                    width: '60px', height: '60px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    fontSize: '1.5rem', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem'
                  }}>{item.step}</div>
                  <h3>{item.title}</h3>
                  <p style={{ color: '#555', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRODUCT CATEGORIES ===== */}
        <section style={{ padding: '5rem 0' }}>
          <div style={sectionStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Art Categories Available at Wholesale</h2>
            <p style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 3rem', color: '#555', lineHeight: 1.6 }}>
              Discover original artwork across every medium — from canvas paintings to handcrafted ceramics.
              All wholesale, all from verified independent artists.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {CATEGORIES.map((cat) => (
                <Link href="/marketplace" key={cat} style={{
                  display: 'block',
                  padding: '1.25rem 1.5rem',
                  background: 'white',
                  borderRadius: 'var(--border-radius-sm)',
                  boxShadow: 'var(--shadow-soft)',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: 'var(--primary-color)',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  textDecoration: 'none',
                  marginRight: 0
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-medium)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-soft)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHOLESALE BUYER BENEFITS ===== */}
        <section style={{ padding: '5rem 0', background: '#f9fafb' }}>
          <div style={sectionStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Wholesale Buyer Benefits</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem'
            }}>
              {[
                { title: 'Tiered Wholesale Pricing', desc: 'Unlock volume-based pricing tiers. The more you buy, the more you save — built into every product page once approved.' },
                { title: 'Quality Guarantee', desc: 'Every artist is curated and verified. If a product does not meet your expectations, our support team is here to help.' },
                { title: 'Artist Discovery Tools', desc: 'Search by medium, style, price range, and more. Save favorites, follow artists, and get notified when new work is listed.' },
                { title: 'Order Management Dashboard', desc: 'Track orders, view invoices, reorder previous purchases, and manage your wholesale account from one dashboard.' },
                { title: 'Shipping & Fulfillment', desc: 'Artists handle fulfillment directly, keeping costs low. Shipping timelines and costs are transparent on every product page.' },
                { title: 'Secure Payments via Stripe', desc: 'All transactions are processed securely through Stripe. Pay by card with full buyer protection.' }
              ].map((item) => (
                <div key={item.title} style={{
                  background: 'white',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '2rem',
                  boxShadow: 'var(--shadow-soft)'
                }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>{item.title}</h3>
                  <p style={{ color: '#555', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section style={{ padding: '5rem 0' }}>
          <div style={{ ...sectionStyle, maxWidth: '850px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Frequently Asked Questions About Wholesale Art</h2>
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} style={{
                borderBottom: '1px solid #e5e7eb',
                padding: '1.25rem 0'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: 'var(--text-color)',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {item.question}
                  <span style={{ fontSize: '1.25rem', color: 'var(--primary-color)', marginLeft: '1rem', flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ color: '#555', lineHeight: 1.7, marginTop: '0.75rem' }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ===== WHOLESALE RESOURCES ===== */}
        {articles.length > 0 && (
          <section style={{ padding: '5rem 0', background: '#f9fafb' }}>
            <div style={sectionStyle}>
              <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Wholesale Art Resources</h2>
              <p style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 3rem', color: '#555', lineHeight: 1.6 }}>
                Guides and articles to help you navigate wholesale art buying for your business.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem'
              }}>
                {articles.map((article) => (
                  <Link href={`/articles/${article.slug}`} key={article.id} style={{
                    display: 'block',
                    background: 'white',
                    borderRadius: 'var(--border-radius-md)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-soft)',
                    textDecoration: 'none',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    marginRight: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-medium)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-soft)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ padding: '1.5rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{article.title}</h3>
                      {article.excerpt && (
                        <p style={{ color: '#555', lineHeight: 1.5, margin: 0, fontSize: '0.95rem' }}>
                          {article.excerpt}
                        </p>
                      )}
                      <p style={{
                        color: 'var(--primary-color)',
                        fontWeight: 600,
                        marginTop: '0.75rem',
                        marginBottom: 0,
                        fontSize: '0.9rem'
                      }}>
                        Read more →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <Link href="/topics/wholesale" style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                  View all wholesale resources →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ===== FINAL CTA ===== */}
        <section style={{
          background: 'var(--gradient-primary)',
          color: 'white',
          padding: '5rem 0',
          textAlign: 'center'
        }}>
          <div style={sectionStyle}>
            <h2 style={{
              color: 'white',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              marginBottom: '1rem'
            }}>
              Ready to Buy Wholesale Art?
            </h2>
            <p style={{
              fontSize: '1.15rem',
              lineHeight: 1.6,
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
              opacity: 0.92
            }}>
              Join retailers, designers, and galleries who source original artwork
              directly from independent artists at wholesale pricing.
            </p>
            {authChecked && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="large" onClick={() => { window.location.href = ctaUrl; }}
                  style={{ background: 'white', color: 'var(--primary-color)' }}>
                  {ctaLabel}
                </button>
              </div>
            )}
            <p style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.7 }}>
              Secure payments powered by Stripe &bull; Free to apply &bull; No monthly fees
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
