const { createLayout } = require('../components/layout');

function createCatalogPage() {
  const content = `
    <div class="content-area">
        <div class="catalog-container">
            <h1>Product Catalog</h1>
            
            <!-- Tab Navigation -->
            <div class="tab-nav">
                <button class="tab-btn active" onclick="showTab('collections')">Product Collections</button>
                <button class="tab-btn" onclick="showTab('products')">Products</button>
            </div>
            
            <!-- Collections Tab -->
            <div id="collections-tab" class="tab-content active">
                <div class="form-section">
                    <h3>Add Collection</h3>
                    <form id="collection-form">
                        <input type="text" id="collection-name" placeholder="Collection name" required>
                        <input type="text" id="collection-description" placeholder="Description (optional)">
                        <button type="submit">Add Collection</button>
                    </form>
                </div>
                
                <div class="list-section">
                    <h3>Collections</h3>
                    <div id="collections-list">Loading...</div>
                </div>
            </div>
            
            <!-- Products Tab -->
            <div id="products-tab" class="tab-content">
                <div class="filter-section">
                    <select id="collection-filter" onchange="filterProducts()">
                        <option value="">All Collections</option>
                    </select>
                    <span class="product-count">Total: <span id="total-products">0</span> products</span>
                </div>
                
                <div class="list-section">
                    <div id="products-list">Loading...</div>
                    
                    <!-- Pagination -->
                    <div class="pagination" id="pagination">
                        <button id="prev-page" onclick="changePage(-1)" disabled>← Previous</button>
                        <span id="page-info">Page 1 of 1</span>
                        <button id="next-page" onclick="changePage(1)" disabled>Next →</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

  const additionalCSS = `
    <style>
        .catalog-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .tab-nav { border-bottom: 2px solid #eee; margin-bottom: 2rem; }
        .tab-btn { 
            background: none; border: none; padding: 1rem 2rem; cursor: pointer; 
            border-bottom: 3px solid transparent; font-weight: 500;
        }
        .tab-btn.active { border-bottom-color: #3498db; color: #3498db; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .form-section { 
            background: #f8f9fa; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; 
        }
        .form-section form { display: flex; gap: 1rem; flex-wrap: wrap; align-items: end; }
        .form-section input { 
            padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; flex: 1; min-width: 200px;
        }
        .form-section button { 
            background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; 
            border-radius: 4px; cursor: pointer; white-space: nowrap;
        }
        .form-section button:hover { background: #2980b9; }
        .filter-section {
            background: #f8f9fa; padding: 1rem 2rem; border-radius: 8px; margin-bottom: 2rem;
            display: flex; justify-content: space-between; align-items: center;
        }
        .filter-section select {
            padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-width: 200px;
        }
        .product-count {
            font-weight: 500; color: #666;
        }
        .list-section { background: white; padding: 2rem; border-radius: 8px; }
        .item { 
            padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; 
            justify-content: space-between; align-items: center; 
        }
        .item:last-child { border-bottom: none; }
        .item-info h4 { margin: 0 0 0.5rem 0; color: #2c3e50; }
        .item-info p { margin: 0; color: #666; font-size: 0.9rem; }
        .item-meta { text-align: right; color: #666; font-size: 0.9rem; }
        .item-actions { display: flex; gap: 0.5rem; }
        .edit-btn { 
            background: #f39c12; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .delete-btn { 
            background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .pagination {
            display: flex; justify-content: center; align-items: center; gap: 1rem;
            margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #eee;
        }
        .pagination button {
            background: #3498db; color: white; border: none; padding: 0.5rem 1rem;
            border-radius: 4px; cursor: pointer;
        }
        .pagination button:disabled {
            background: #bdc3c7; cursor: not-allowed;
        }
        .pagination button:hover:not(:disabled) { background: #2980b9; }
        #page-info { font-weight: 500; }
        
        @media (max-width: 768px) {
            .filter-section { flex-direction: column; gap: 1rem; align-items: stretch; }
            .item { flex-direction: column; align-items: flex-start; gap: 1rem; }
            .item-actions { align-self: flex-end; }
        }
    </style>
  `;

  const additionalJS = `
    <script>
        let currentPage = 1;
        let totalPages = 1;
        let currentFilter = '';
        const itemsPerPage = 25;
        
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
        }
        
        // Load data when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadCollections();
            loadProducts();
            
            // Form handlers
            document.getElementById('collection-form').addEventListener('submit', addCollection);
        });
        
        async function loadCollections() {
            try {
                const response = await fetch('/api/collections');
                const collections = await response.json();
                
                // Update collections list
                const listEl = document.getElementById('collections-list');
                listEl.innerHTML = collections.map(col => 
                    \`<div class="item">
                        <div class="item-info">
                            <h4>\${col.name}</h4>
                            <p>\${col.description || 'No description'}</p>
                        </div>
                        <div class="item-actions">
                            <button class="delete-btn" onclick="deleteCollection(\${col.id})">Delete</button>
                        </div>
                    </div>\`
                ).join('');
                
                // Update filter dropdown
                const filterEl = document.getElementById('collection-filter');
                filterEl.innerHTML = '<option value="">All Collections</option>' + 
                    collections.map(col => \`<option value="\${col.id}">\${col.name}</option>\`).join('');
                    
            } catch (error) {
                console.error('Error loading collections:', error);
            }
        }
        
        async function loadProducts(page = 1) {
            try {
                const params = new URLSearchParams({
                    page: page,
                    limit: itemsPerPage
                });
                
                if (currentFilter) {
                    params.append('collection_id', currentFilter);
                }
                
                const response = await fetch(\`/api/products?\${params}\`);
                const data = await response.json();
                
                // Update products list
                const listEl = document.getElementById('products-list');
                listEl.innerHTML = data.products.map(prod => 
                    \`<div class="item">
                        <div class="item-info">
                            <h4>\${prod.title} \${prod.sku ? '(' + prod.sku + ')' : ''}</h4>
                            <p>Collection: \${prod.collection_name || 'Uncategorized'} | Batch: \${prod.batch_quantity} | Cost: $\${prod.cost_per_item}</p>
                        </div>
                        <div class="item-meta">
                            <p>Created: \${new Date(prod.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="item-actions">
                            <button class="edit-btn" onclick="editCatalogProduct(\${prod.id})">Edit Catalog</button>
                            <button class="delete-btn" onclick="deleteProduct(\${prod.id})">Delete</button>
                        </div>
                    </div>\`
                ).join('');
                
                // Update pagination
                currentPage = page;
                totalPages = data.totalPages;
                document.getElementById('page-info').textContent = \`Page \${page} of \${totalPages}\`;
                document.getElementById('prev-page').disabled = page <= 1;
                document.getElementById('next-page').disabled = page >= totalPages;
                
                // Update product count
                document.getElementById('total-products').textContent = data.totalProducts;
                    
            } catch (error) {
                console.error('Error loading products:', error);
            }
        }
        
        async function addCollection(e) {
            e.preventDefault();
            const name = document.getElementById('collection-name').value;
            const description = document.getElementById('collection-description').value;
            
            try {
                const response = await fetch('/api/collections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description })
                });
                
                if (response.ok) {
                    document.getElementById('collection-form').reset();
                    loadCollections();
                }
            } catch (error) {
                console.error('Error adding collection:', error);
            }
        }
        
        async function deleteCollection(id) {
            if (confirm('Delete this collection? Products in this collection will be uncategorized.')) {
                try {
                    await fetch(\`/api/collections/\${id}\`, { method: 'DELETE' });
                    loadCollections();
                    loadProducts(); // Refresh products in case filter was active
                } catch (error) {
                    console.error('Error deleting collection:', error);
                }
            }
        }
        
        function filterProducts() {
            currentFilter = document.getElementById('collection-filter').value;
            loadProducts(1); // Reset to page 1 when filtering
        }
        
        function changePage(direction) {
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= totalPages) {
                loadProducts(newPage);
            }
        }
        
        function editCatalogProduct(id) {
            // Redirect to full product management page for catalog editing
            window.location.href = '/products?edit=' + id;
        }
        
        async function deleteProduct(id) {
            if (confirm('Delete this product?')) {
                try {
                    await fetch(\`/api/products/\${id}\`, { method: 'DELETE' });
                    loadProducts(currentPage);
                } catch (error) {
                    console.error('Error deleting product:', error);
                }
            }
        }
    </script>
  `;

  return createLayout({
    title: 'Catalog - Luca Platform',
    currentPath: '/catalog',
    content,
    additionalCSS,
    additionalJS
  });
}

module.exports = { createCatalogPage };
