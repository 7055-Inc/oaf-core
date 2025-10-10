/**
 * Header Component for Luca Platform
 * Reusable header with navigation that can be merged into main app later
 */

function createHeader(currentPath = '/') {
  return `
    <header class="header">
        <div class="header-container">
            <div class="logo-container">
                <img src="/static/images/luca.png" alt="Luca Logo" class="logo">
                <a href="/" class="logo-text">Luca</a>
            </div>
            <nav>
                <ul class="nav-menu">
                    <li><a href="/" ${currentPath === '/' ? 'class="active"' : ''}>Dashboard</a></li>
                    <li><a href="/costing/materials" ${currentPath.startsWith('/costing') ? 'class="active"' : ''}>Costing</a></li>
                    <li><a href="/recipes" ${currentPath === '/recipes' ? 'class="active"' : ''}>Recipes</a></li>
                    <li><a href="/catalog" ${currentPath === '/catalog' ? 'class="active"' : ''}>Catalog</a></li>
                    <li><a href="/shipping" ${currentPath === '/shipping' ? 'class="active"' : ''}>Shipping</a></li>
                    <li><a href="/marketplace" ${currentPath === '/marketplace' ? 'class="active"' : ''}>Marketplace</a></li>
                    <li><a href="/settings" ${currentPath === '/settings' ? 'class="active"' : ''}>Settings</a></li>
                </ul>
            </nav>
        </div>
    </header>
  `;
}

module.exports = { createHeader };
