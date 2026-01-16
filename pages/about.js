'use client';
import Head from 'next/head';
import Link from 'next/link';
import styles from './about.module.css';

// Ecosystem Overview Diagram Component - with SVG connecting lines
const EcosystemDiagram = () => (
  <div className={styles.diagram}>
    <svg className={styles.ecosystemSvg} viewBox="0 0 500 400" preserveAspectRatio="xMidYMid meet">
      {/* Connecting lines from nodes to center */}
      <line x1="80" y1="70" x2="250" y2="180" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="420" y1="70" x2="250" y2="180" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="80" y1="220" x2="250" y2="200" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="420" y1="220" x2="250" y2="200" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="250" y1="350" x2="250" y2="230" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      
      {/* Artists node - top left */}
      <g className={styles.ecoNode}>
        <circle cx="80" cy="35" r="18" fill="none" stroke="#055474" strokeWidth="2"/>
        <circle cx="80" cy="30" r="8" fill="none" stroke="#055474" strokeWidth="2"/>
        <path d="M68 50c0-5 5-8 12-8s12 3 12 8" fill="none" stroke="#055474" strokeWidth="2"/>
        <text x="80" y="75" textAnchor="middle" fill="#555" fontSize="13">Artists</text>
      </g>
      
      {/* Shoppers node - top right */}
      <g className={styles.ecoNode}>
        <rect x="62" y="22" width="36" height="28" rx="3" fill="none" stroke="#055474" strokeWidth="2"/>
        <path d="M68 22v-6a12 12 0 0124 0v6" fill="none" stroke="#055474" strokeWidth="2"/>
        <text x="420" y="75" textAnchor="middle" fill="#555" fontSize="13">Shoppers</text>
      </g>
      <g transform="translate(340, 0)">
        <rect x="62" y="22" width="36" height="28" rx="3" fill="none" stroke="#055474" strokeWidth="2"/>
        <path d="M68 22v-6a12 12 0 0124 0v6" fill="none" stroke="#055474" strokeWidth="2"/>
      </g>
      
      {/* Promoters node - middle left */}
      <g transform="translate(0, 150)">
        <rect x="56" y="22" width="48" height="36" rx="3" fill="none" stroke="#055474" strokeWidth="2"/>
        <line x1="56" y1="32" x2="104" y2="32" stroke="#055474" strokeWidth="2"/>
        <line x1="72" y1="32" x2="72" y2="58" stroke="#055474" strokeWidth="2"/>
        <text x="80" y="75" textAnchor="middle" fill="#555" fontSize="13">Promoters</text>
      </g>
      
      {/* Production node - middle right */}
      <g transform="translate(340, 150)">
        <rect x="56" y="14" width="20" height="20" rx="2" fill="none" stroke="#055474" strokeWidth="2"/>
        <rect x="80" y="14" width="20" height="20" rx="2" fill="none" stroke="#055474" strokeWidth="2"/>
        <rect x="68" y="38" width="20" height="20" rx="2" fill="none" stroke="#055474" strokeWidth="2"/>
        <text x="80" y="75" textAnchor="middle" fill="#555" fontSize="13">Production</text>
      </g>
      
      {/* Physical Spaces node - bottom center */}
      <g transform="translate(210, 290)">
        <path d="M20 60V30l20-14 20 14v30H20z" fill="none" stroke="#055474" strokeWidth="2"/>
        <rect x="30" y="40" width="20" height="20" fill="none" stroke="#055474" strokeWidth="2"/>
        <text x="40" y="75" textAnchor="middle" fill="#555" fontSize="13">Physical Spaces</text>
      </g>
      
      {/* Center - Brakebee Platform circle */}
      <circle cx="250" cy="200" r="55" fill="rgba(5,84,116,0.05)" stroke="#055474" strokeWidth="2"/>
      <text x="250" y="195" textAnchor="middle" fill="#055474" fontSize="12" fontWeight="600">Brakebee</text>
      <text x="250" y="210" textAnchor="middle" fill="#055474" fontSize="12" fontWeight="600">Platform</text>
      
      {/* Leo Art AI badge */}
      <rect x="205" y="235" width="90" height="22" rx="11" fill="rgba(62,28,86,0.1)"/>
      <circle cx="220" cy="246" r="5" fill="#3E1C56"/>
      <text x="260" y="250" textAnchor="middle" fill="#3E1C56" fontSize="11">Leo Art AI</text>
    </svg>
  </div>
);

// Five Pillar Diagram Component - SVG with proper connecting lines
const FivePillarDiagram = () => (
  <div className={styles.diagram}>
    <svg className={styles.pillarSvg} viewBox="0 0 700 230" preserveAspectRatio="xMidYMid meet">
      {/* Connecting lines from each pillar to Leo AI center */}
      <line x1="70" y1="70" x2="350" y2="170" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="210" y1="70" x2="350" y2="170" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="350" y1="70" x2="350" y2="170" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="490" y1="70" x2="350" y2="170" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      <line x1="630" y1="70" x2="350" y2="170" stroke="#055474" strokeWidth="2" opacity="0.3"/>
      
      {/* Pillar boxes */}
      <g>
        <rect x="10" y="15" width="120" height="55" rx="4" fill="#fff" stroke="#055474" strokeWidth="1.5"/>
        <text x="70" y="38" textAnchor="middle" fill="#333" fontSize="11">Marketplace</text>
        <text x="70" y="52" textAnchor="middle" fill="#333" fontSize="11">& Commerce</text>
      </g>
      
      <g>
        <rect x="145" y="15" width="130" height="55" rx="4" fill="#fff" stroke="#055474" strokeWidth="1.5"/>
        <text x="210" y="38" textAnchor="middle" fill="#333" fontSize="11">Artist & Promoter</text>
        <text x="210" y="52" textAnchor="middle" fill="#333" fontSize="11">Platforms</text>
      </g>
      
      <g>
        <rect x="290" y="15" width="120" height="55" rx="4" fill="#fff" stroke="#055474" strokeWidth="1.5"/>
        <text x="350" y="45" textAnchor="middle" fill="#333" fontSize="11">Wholesale & B2B</text>
      </g>
      
      <g>
        <rect x="425" y="15" width="130" height="55" rx="4" fill="#fff" stroke="#055474" strokeWidth="1.5"/>
        <text x="490" y="38" textAnchor="middle" fill="#333" fontSize="11">Production</text>
        <text x="490" y="52" textAnchor="middle" fill="#333" fontSize="11">& Reproduction</text>
      </g>
      
      <g>
        <rect x="570" y="15" width="120" height="55" rx="4" fill="#fff" stroke="#055474" strokeWidth="1.5"/>
        <text x="630" y="45" textAnchor="middle" fill="#333" fontSize="11">Physical Spaces</text>
      </g>
      
      {/* Leo Art AI center */}
      <circle cx="350" cy="170" r="22" fill="none" stroke="#3E1C56" strokeWidth="2"/>
      <circle cx="350" cy="170" r="8" fill="#3E1C56"/>
      <text x="350" y="205" textAnchor="middle" fill="#3E1C56" fontSize="12" fontWeight="600">Leo Art AI</text>
    </svg>
  </div>
);

// Global Cart Flow Diagram
const GlobalCartDiagram = () => (
  <div className={styles.diagram}>
    <div className={styles.cartFlow}>
      <div className={styles.storefrontCards}>
        <div className={styles.storefrontCard}>Artist Site A</div>
        <div className={styles.storefrontCard}>Artist Site B</div>
        <div className={styles.storefrontCard}>Brand Collection</div>
        <div className={styles.storefrontCard}>Gallery Collection</div>
      </div>
      <div className={styles.flowArrow}>
        <svg viewBox="0 0 40 20" width="40" height="20">
          <path d="M0 10h30M25 5l8 5-8 5" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </div>
      <div className={styles.globalCartBox}>
        <svg viewBox="0 0 24 24" width="22" height="22">
          <circle cx="9" cy="20" r="2" fill="currentColor"/>
          <circle cx="18" cy="20" r="2" fill="currentColor"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span>Global Cart</span>
      </div>
      <div className={styles.flowArrow}>
        <svg viewBox="0 0 40 20" width="40" height="20">
          <path d="M0 10h30M25 5l8 5-8 5" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </div>
      <div className={styles.checkoutOptions}>
        <div className={styles.checkoutOption}>Single Checkout</div>
        <div className={styles.checkoutOption}>Multiple Carts</div>
        <div className={styles.checkoutOption}>Wishlists</div>
        <div className={styles.returnLater}>Return later without losing context</div>
      </div>
    </div>
  </div>
);

// Application Loop Diagram - simplified, no feedback arc
const ApplicationLoopDiagram = () => (
  <div className={styles.diagram}>
    <div className={styles.loopContainer}>
      <div className={styles.loopStep}>
        <div className={styles.loopIcon}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M4 22c0-6 4-8 8-8s8 2 8 8" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <span>Artist Profile</span>
      </div>
      <div className={styles.loopArrow}>→</div>
      <div className={styles.loopStep}>
        <div className={styles.loopIcon}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 8h10M7 12h6" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <span>Apply</span>
      </div>
      <div className={styles.loopArrow}>→</div>
      <div className={styles.loopStep}>
        <div className={styles.loopIcon}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <span>Jury Review</span>
      </div>
      <div className={styles.loopArrow}>→</div>
      <div className={styles.loopStep}>
        <div className={styles.loopIcon}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="2" y="6" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <span>Exhibit/Sell</span>
      </div>
      <div className={styles.loopArrow}>→</div>
      <div className={styles.loopStep}>
        <div className={styles.loopIcon}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <span>Artist Review</span>
      </div>
      <div className={styles.loopArrow}>→</div>
      <div className={styles.loopStep}>
        <div className={styles.loopIcon}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </div>
        <span>Leo AI Insights</span>
      </div>
    </div>
  </div>
);

// Wholesale Growth Path - with arrows
const WholesalePathDiagram = () => (
  <div className={styles.diagram}>
    <div className={styles.growthPath}>
      <div className={styles.growthStep}>
        <div className={styles.stepNumber}>1</div>
        <div className={styles.stepContent}>
          <strong>First Sale</strong>
          <span>Your journey begins</span>
        </div>
      </div>
      <div className={styles.growthConnector}>→</div>
      <div className={styles.growthStep}>
        <div className={styles.stepNumber}>2</div>
        <div className={styles.stepContent}>
          <strong>Consistent Listings</strong>
          <span>Build your catalog</span>
        </div>
      </div>
      <div className={styles.growthConnector}>→</div>
      <div className={styles.growthStep}>
        <div className={styles.stepNumber}>3</div>
        <div className={styles.stepContent}>
          <strong>Reproductions</strong>
          <span>Scale your best work</span>
        </div>
      </div>
      <div className={styles.growthConnector}>→</div>
      <div className={styles.growthStep}>
        <div className={styles.stepNumber}>4</div>
        <div className={styles.stepContent}>
          <strong>Wholesale Ready</strong>
          <span>Pricing & SKU systems</span>
        </div>
      </div>
      <div className={styles.growthConnector}>→</div>
      <div className={styles.growthStep}>
        <div className={styles.stepNumber}>5</div>
        <div className={styles.stepContent}>
          <strong>Retail/B2B Channels</strong>
          <span>Multi-channel distribution</span>
        </div>
      </div>
    </div>
  </div>
);

// Production Workflow Diagram - no caption
const ProductionDiagram = () => (
  <div className={styles.diagram}>
    <div className={styles.productionFlow}>
      <div className={styles.productionStep}>
        <svg viewBox="0 0 40 40" className={styles.productionIcon}>
          <rect x="4" y="4" width="32" height="32" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span>Original Artwork</span>
      </div>
      <div className={styles.productionArrow}>→</div>
      <div className={styles.productionStep}>
        <svg viewBox="0 0 40 40" className={styles.productionIcon}>
          <rect x="4" y="8" width="32" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M14 20l4 4 8-8" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        <span>Approved Proof</span>
      </div>
      <div className={styles.productionArrow}>→</div>
      <div className={styles.productionStep}>
        <svg viewBox="0 0 40 40" className={styles.productionIcon}>
          <rect x="2" y="10" width="12" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="10" width="12" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
          <rect x="26" y="10" width="12" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span>Limited Run</span>
      </div>
      <div className={styles.productionArrow}>→</div>
      <div className={styles.productionStep}>
        <svg viewBox="0 0 40 40" className={styles.productionIcon}>
          <rect x="8" y="14" width="24" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 20h24M20 8v6" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span>Packaging</span>
      </div>
      <div className={styles.productionArrow}>→</div>
      <div className={styles.productionStep}>
        <svg viewBox="0 0 40 40" className={styles.productionIcon}>
          <circle cx="20" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 36c0-8 5-12 12-12s12 4 12 12" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span>Customer</span>
      </div>
    </div>
    <div className={styles.productionBadge}>
      <svg viewBox="0 0 20 20" width="14" height="14">
        <path d="M10 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="currentColor"/>
      </svg>
      Artist Control + Transparent Royalties
    </div>
  </div>
);

// Physical Spaces Diagram - no caption
const PhysicalSpacesDiagram = () => (
  <div className={styles.diagram}>
    <div className={styles.spacesGrid}>
      <div className={styles.spaceColumn}>
        <h4>Digital Platform</h4>
        <ul>
          <li>Marketplace</li>
          <li>Artist Sites</li>
          <li>Applications</li>
          <li>Leo Art AI</li>
        </ul>
      </div>
      <div className={styles.spaceArrows}>
        <svg viewBox="0 0 60 100" width="50" height="80">
          <path d="M10 30h40M50 30l-8-5M50 30l-8 5" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M50 70H10M10 70l8-5M10 70l8 5" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </div>
      <div className={styles.spaceColumn}>
        <h4>Physical Spaces</h4>
        <ul>
          <li>Gallery</li>
          <li>Showroom</li>
          <li>Events</li>
          <li>Studio/Production</li>
        </ul>
      </div>
    </div>
  </div>
);

// Leo AI Diagram - with flow arrows
const LeoAIDiagram = () => (
  <div className={styles.diagram}>
    <div className={styles.leoGrid}>
      <div className={styles.leoInputs}>
        <h4>Inputs</h4>
        <div className={styles.leoItem}>Sales Data</div>
        <div className={styles.leoItem}>Event Reviews</div>
        <div className={styles.leoItem}>Jury Trends</div>
        <div className={styles.leoItem}>Browsing Behavior</div>
      </div>
      <div className={styles.leoArrows}>
        <svg viewBox="0 0 40 20" width="40" height="20">
          <path d="M0 10h30M25 5l8 5-8 5" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </div>
      <div className={styles.leoCenter}>
        <div className={styles.leoCenterCircle}>
          <svg viewBox="0 0 48 48" width="44" height="44">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="24" cy="24" r="8" fill="currentColor" opacity="0.2"/>
            <circle cx="24" cy="24" r="4" fill="currentColor"/>
          </svg>
          <span>Leo Art AI</span>
        </div>
      </div>
      <div className={styles.leoArrows}>
        <svg viewBox="0 0 40 20" width="40" height="20">
          <path d="M0 10h30M25 5l8 5-8 5" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </div>
      <div className={styles.leoOutputs}>
        <h4>Outputs</h4>
        <div className={styles.leoItem}>Artist Insights</div>
        <div className={styles.leoItem}>Promoter Analytics</div>
        <div className={styles.leoItem}>Smarter Discovery</div>
      </div>
    </div>
  </div>
);

export default function AboutPage() {
  const tocItems = [
    { id: 'what-is-brakebee', label: 'What Is Brakebee?' },
    { id: 'ecosystem', label: 'Ecosystem' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'applications', label: 'Applications & Jurying' },
    { id: 'wholesale', label: 'Wholesale' },
    { id: 'production', label: 'Production' },
    { id: 'physical-spaces', label: 'Physical Spaces' },
    { id: 'leo-ai', label: 'Leo Art AI' },
    { id: 'who-its-for', label: "Who It's For" },
    { id: 'philosophy', label: 'Philosophy' },
    { id: 'long-view', label: 'Long View' },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>About Brakebee | The Operating System for the Everyday Art Ecosystem</title>
        <meta name="description" content="Brakebee is a vertically integrated marketplace + platform connecting artists, shoppers, and promoters with applications, jury tools, global cart commerce, ethical production, wholesale pathways, physical galleries, and Leo Art AI." />
        <link rel="canonical" href="https://brakebee.com/about" />
        <meta property="og:title" content="About Brakebee | The Operating System for the Everyday Art Ecosystem" />
        <meta property="og:description" content="Brakebee is a vertically integrated marketplace + platform connecting artists, shoppers, and promoters with applications, jury tools, global cart commerce, ethical production, wholesale pathways, physical galleries, and Leo Art AI." />
        <meta property="og:image" content="/og/about-brakebee.png" />
        <meta property="og:url" content="https://brakebee.com/about" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Brakebee | The Operating System for the Everyday Art Ecosystem" />
        <meta name="twitter:description" content="Brakebee is a vertically integrated marketplace + platform connecting artists, shoppers, and promoters." />
        <meta name="twitter:image" content="/og/about-brakebee.png" />
      </Head>

      <main>
        <div className={styles.container}>
          
          {/* Hero Section */}
          <header className={styles.hero}>
            <h1>About Brakebee</h1>
            <p className={styles.heroSubhead}>The Operating System for the Everyday Art Ecosystem</p>
            <p className={styles.heroIntro}>
              Connecting artists, shoppers, promoters, galleries, and partners through an integrated platform 
              designed for how art actually moves — from creation to collection.
            </p>
          </header>

          {/* Table of Contents */}
          <nav className={styles.toc}>
            <h3>In This Page</h3>
            <ul>
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          {/* What Is Brakebee */}
          <section id="what-is-brakebee" className={styles.section}>
            <span className={styles.sectionKicker}>Introduction</span>
            <h2>What Is Brakebee?</h2>
            
            <p>
              Brakebee is a vertically integrated art commerce platform and operating system built for 
              the <strong>entire everyday art ecosystem</strong> — artists, shoppers, promoters, galleries, 
              manufacturers, and partners.
            </p>
            
            <p>
              At its core, Brakebee exists to solve a problem that nearly everyone in the art world 
              feels but few platforms address directly:
            </p>
            
            <blockquote className={styles.pullQuote}>Art is fragmented.</blockquote>
            
            <p>
              Artists are forced to juggle disconnected tools. Promoters rely on outdated systems. 
              Shoppers struggle to discover work that truly fits their space and taste. And most platforms 
              focus on only one slice of the ecosystem, leaving everyone else to patch the rest together on their own.
            </p>
            
            <p>Brakebee was designed to change that.</p>
            
            <p>
              Rather than building yet another single-purpose marketplace or application tool, we built an 
              interconnected platform that supports how art actually moves — from creation, to application, 
              to production, to sale, to long-term growth.
            </p>
            
            <p>We are not just a marketplace.</p>
            <p>We are not just software.</p>
            <p>And we are not just a gallery or production studio.</p>
            
            <p><strong>Brakebee is the connective infrastructure that ties all of those together.</strong></p>
            
            <EcosystemDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Ecosystem */}
          <section id="ecosystem" className={styles.section}>
            <span className={styles.sectionKicker}>Big Picture</span>
            <h2>The Brakebee Ecosystem</h2>
            
            <p>
              Brakebee is intentionally designed as a multi-layered ecosystem. Each part can stand on its own, 
              but its real strength comes from how tightly everything connects.
            </p>
            
            <p>The platform is built around five core pillars:</p>
            
            <ol>
              <li><strong>Marketplace & Commerce</strong> – Where art is discovered, purchased, and collected</li>
              <li><strong>Artist & Promoter Platforms</strong> – Tools to apply, jury, manage, and promote events</li>
              <li><strong>Wholesale & B2B Distribution</strong> – Pathways for artists to scale into retail and bulk channels</li>
              <li><strong>Production & Reproduction</strong> – Ethical, artist-first manufacturing and fulfillment</li>
              <li><strong>Physical Spaces</strong> – Galleries, studios, and experiential art environments</li>
            </ol>
            
            <p>
              What ties these pillars together is <strong>Leo Art AI</strong>, our intelligence layer that helps 
              artists, promoters, and buyers make better, more informed decisions.
            </p>
            
            <FivePillarDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Marketplace */}
          <section id="marketplace" className={styles.section}>
            <span className={styles.sectionKicker}>Commerce</span>
            <h2>The Brakebee Marketplace</h2>
            
            <p>
              The Brakebee Marketplace is where many people first encounter the platform — but it's only 
              one layer of a much larger system.
            </p>
            
            <p>
              At its simplest, the marketplace is a curated, multi-vendor destination for <strong>everyday 
              art with exceptional quality</strong>. But behind the scenes, it functions more like a 
              distributed commerce engine than a traditional storefront.
            </p>
            
            <p>
              Shoppers can explore original work, limited editions, and functional art across many 
              Brakebee-powered artist and brand sites — all while enjoying a unified buying experience.
            </p>
            
            <p>
              A core differentiator is Brakebee's <strong>global cart and wishlist system</strong>. 
              Buyers can browse multiple artist sites, collections, and branded storefronts, then:
            </p>
            
            <ul>
              <li>Purchase everything in a single checkout</li>
              <li>Save items across multiple carts or wishlists</li>
              <li>Return later without losing context</li>
            </ul>
            
            <p>
              This removes friction for collectors while preserving each artist's independent brand and storefront.
            </p>
            
            <p>
              For artists, the marketplace supports growth over time. Many start with a single product or 
              collection, then expand into reproductions, wholesale-ready items, and multi-channel distribution 
              — without rebuilding their business on new platforms.
            </p>
            
            <GlobalCartDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Applications & Jurying */}
          <section id="applications" className={styles.section}>
            <span className={styles.sectionKicker}>Events</span>
            <h2>Applications, Jurying & Events</h2>
            
            <p>
              Art festivals and events are a critical part of the art economy, yet the tools behind them 
              are often the most outdated.
            </p>
            
            <p>
              Brakebee modernizes the entire lifecycle — from application to jurying to post-event feedback 
              — creating a closed loop that benefits both artists and promoters.
            </p>
            
            <p>
              Artists maintain a single, reusable profile that includes their work, statements, booth images, 
              and inventory. That profile can be used to apply to multiple events without starting over each 
              time, dramatically reducing friction and repetition.
            </p>
            
            <p>
              Promoters gain access to flexible jury systems that reflect how real juries operate. Panels 
              can review applications on their own schedules, score work against custom criteria, and move 
              seamlessly from review to acceptance.
            </p>
            
            <p>
              After events conclude, Brakebee's <strong>artist review system</strong> captures real, 
              structured feedback about event quality, sales performance, logistics, and overall experience. 
              This data doesn't just sit in a vacuum — it feeds directly into Leo Art AI.
            </p>
            
            <p>
              Over time, artists gain clearer insight into which events perform best for their work, 
              helping them make smarter exhibiting decisions.
            </p>
            
            <ApplicationLoopDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Wholesale */}
          <section id="wholesale" className={styles.section}>
            <span className={styles.sectionKicker}>Growth</span>
            <h2>Wholesale & B2B Distribution</h2>
            
            <p>
              For many artists, wholesale is where growth stalls — not because demand isn't there, 
              but because the leap feels overwhelming.
            </p>
            
            <p>Brakebee is built to bridge that gap.</p>
            
            <p>
              Artists can prepare wholesale-ready products within the same system they already use for 
              direct sales. Pricing tiers, SKUs, and centralized product identification make it possible 
              to move into retail, corporate, and bulk sales without restructuring their entire operation.
            </p>
            
            <ul>
              <li>Wholesale pricing and SKU management</li>
              <li>Retail-ready product formatting</li>
              <li>Centralized product identification</li>
              <li>Access to B2B buyers and partners</li>
            </ul>
            
            <p>The result is a smoother transition from one-off sales to scalable distribution.</p>
            
            <WholesalePathDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Production */}
          <section id="production" className={styles.section}>
            <span className={styles.sectionKicker}>Manufacturing</span>
            <h2>Production & Artist Reproduction Services</h2>
            
            <p>Scaling art production responsibly is one of the hardest challenges artists face.</p>
            
            <p>
              Brakebee operates an in-house and partner-based production network designed specifically 
              for artists who want to grow without losing control of their work.
            </p>
            
            <p>
              We support fine art reproductions, limited edition runs, and retail-ready decor across 
              multiple materials and formats. Artists retain creative control, pricing transparency, 
              and clear royalty structures — while gaining access to consistent, high-quality production.
            </p>
            
            <ul>
              <li>Fine art reproductions</li>
              <li>Metal, wood, and mixed-media decor</li>
              <li>Limited edition and gallery-grade runs</li>
              <li>Ethical, artist-first manufacturing</li>
            </ul>
            
            <p>
              This production layer allows artists to say yes to larger opportunities — galleries, 
              wholesale orders, and retail placements — with confidence.
            </p>
            
            <ProductionDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Physical Spaces */}
          <section id="physical-spaces" className={styles.section}>
            <span className={styles.sectionKicker}>Real World</span>
            <h2>Physical Galleries & Spaces</h2>
            
            <p>Brakebee is digital-first, but not digital-only.</p>
            
            <p>
              We are developing physical spaces that bring the platform into the real world — places 
              where art can be experienced, collected, reviewed, and produced.
            </p>
            
            <p>
              These spaces function as curated galleries, retail showrooms, event venues, production hubs, 
              and artist support centers. They anchor the platform locally while reinforcing the digital 
              ecosystem that surrounds them.
            </p>
            
            <PhysicalSpacesDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Leo Art AI */}
          <section id="leo-ai" className={styles.section}>
            <span className={styles.sectionKicker}>Intelligence</span>
            <h2>Leo Art AI — The Intelligence Layer</h2>
            
            <p>Leo Art AI quietly powers the Brakebee ecosystem behind the scenes.</p>
            
            <p>
              Rather than replacing creativity, Leo focuses on improving decision-making across the 
              platform by learning from real behavior, outcomes, and feedback.
            </p>
            
            <p>
              For artists, Leo analyzes sales data, event reviews, pricing performance, and channel 
              results to surface patterns that would otherwise take years to identify manually.
            </p>
            
            <p>
              Promoters benefit from aggregated application trends, jury behavior insights, and event 
              performance analytics that help improve future events.
            </p>
            
            <p>
              Shoppers experience smarter discovery, better recommendations, and a marketplace that 
              feels increasingly tailored to their tastes.
            </p>
            
            <p>
              Leo becomes more valuable as the ecosystem grows — turning collective experience into 
              shared intelligence.
            </p>
            
            <LeoAIDiagram />
          </section>

          <div className={styles.divider}></div>

          {/* Who It's For */}
          <section id="who-its-for" className={styles.section}>
            <span className={styles.sectionKicker}>Audience</span>
            <h2>Who Brakebee Is For</h2>
            
            <p>
              Brakebee is built for people and organizations who care about long-term sustainability 
              in the art world.
            </p>
            
            <ul>
              <li>Artists seeking real growth, not just exposure</li>
              <li>Promoters who want modern, reliable infrastructure</li>
              <li>Retailers and buyers looking for curated art at scale</li>
              <li>Manufacturing and logistics partners aligned with ethical production</li>
            </ul>
          </section>

          <div className={styles.divider}></div>

          {/* Philosophy */}
          <section id="philosophy" className={styles.section}>
            <span className={styles.sectionKicker}>Values</span>
            <h2>Our Philosophy</h2>
            
            <p>We believe art should be accessible, not disposable.</p>
            
            <p>
              Artists deserve infrastructure, not just attention. Technology should reduce friction, 
              not create it. And physical and digital experiences should reinforce one another — not compete.
            </p>
            
            <p>
              Brakebee is building the operating system for everyday art, designed to support creators, 
              empower organizers, and make art easier to discover and live with.
            </p>
          </section>

          <div className={styles.divider}></div>

          {/* Long View */}
          <section id="long-view" className={styles.section}>
            <span className={styles.sectionKicker}>Future</span>
            <h2>The Long View</h2>
            
            <p>Brakebee is not a single product or short-term trend.</p>
            
            <p>
              It is a platform, a marketplace, a production engine, and a physical presence — designed 
              to grow over decades.
            </p>
            
            <p>If you are part of the art ecosystem, Brakebee is built to work with you.</p>
            
            <p className={styles.welcome}><strong>Welcome to Brakebee.</strong></p>
          </section>

          {/* CTA Block */}
          <div className={styles.ctaBlock}>
            <h3>Get Started</h3>
            <div className={styles.ctaLinks}>
              <Link href="/marketplace" className={styles.ctaLink}>Explore the Marketplace</Link>
              <Link href="/makers" className={styles.ctaLink}>For Artists</Link>
              <Link href="/promoter" className={styles.ctaLink}>For Promoters</Link>
            </div>
          </div>

          {/* Back to Top */}
          <button onClick={scrollToTop} className={styles.backToTop}>
            ↑ Back to Top
          </button>

        </div>
      </main>
    </>
  );
}
