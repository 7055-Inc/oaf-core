/**
 * Dashboard/Index Page for Luca Platform
 * Main landing page component
 */

const { createLayout } = require('../components/layout');

function createDashboard() {
  const content = `
    <div class="content-area">
        <div class="dashboard-content">
            <h1>🎨 Welcome to Luca Platform</h1>
            <p class="subtitle">Leonardo & Luca are back together - Art meets Accounting!</p>
            
            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <h3>📊 Costing System</h3>
                    <p>Manage materials, calculate costs, and build recipes for your products.</p>
                    <a href="/costing/materials" class="btn btn-primary">Get Started</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>📝 Recipes</h3>
                    <p>Create production recipes with material quantities and batch calculations.</p>
                    <a href="/recipes" class="btn btn-secondary">Coming Soon</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>📚 Catalog</h3>
                    <p>Build your internal product catalog with descriptions and cost associations.</p>
                    <a href="/catalog" class="btn btn-secondary">Coming Soon</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>🚀 Marketplace</h3>
                    <p>AI-powered listing optimization for Amazon, eBay, and other marketplaces.</p>
                    <a href="/marketplace" class="btn btn-secondary">Coming Soon</a>
                </div>
            </div>
        </div>
    </div>
  `;

  const additionalCSS = `
    <style>
        .dashboard-content {
            text-align: center;
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .subtitle {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 3rem;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .dashboard-card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            text-align: left;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .dashboard-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }
        
        .dashboard-card h3 {
            color: #2c3e50;
            margin-bottom: 1rem;
        }
        
        .dashboard-card p {
            color: #666;
            margin-bottom: 1.5rem;
            line-height: 1.6;
        }
        
        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2980b9;
        }
        
        .btn-secondary {
            background: #95a5a6;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #7f8c8d;
        }
    </style>
  `;

  return createLayout({
    title: 'Dashboard - Luca Platform',
    currentPath: '/',
    content,
    additionalCSS
  });
}

module.exports = { createDashboard };
