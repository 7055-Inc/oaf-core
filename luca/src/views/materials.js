const { createLayout } = require('../components/layout');

function createMaterialsPage() {
  const content = `
    <div class="content-area">
        <div class="materials-container">
            <h1>Materials Management</h1>
            
            <!-- Tab Navigation -->
            <div class="tab-nav">
                <button class="tab-btn active" onclick="showTab('categories')">Material Categories</button>
                <button class="tab-btn" onclick="showTab('materials')">Materials</button>
                <button class="tab-btn" onclick="showTab('products')">Product Costing</button>
            </div>
            
            <!-- Categories Tab -->
            <div id="categories-tab" class="tab-content active">
                <div class="form-section">
                    <h3>Add Category</h3>
                    <form id="category-form">
                        <input type="text" id="category-name" placeholder="Category name" required>
                        <button type="submit">Add Category</button>
                    </form>
                </div>
                
                <div class="list-section">
                    <h3>Categories</h3>
                    <div id="categories-list">Loading...</div>
                </div>
            </div>
            
            <!-- Materials Tab -->
            <div id="materials-tab" class="tab-content">
                <div class="form-section">
                    <h3>Add Material</h3>
                    <form id="material-form">
                        <select id="material-category" required>
                            <option value="">Select Category</option>
                        </select>
                        <input type="text" id="material-name" placeholder="Material name" required>
                        <input type="text" id="measure-unit" placeholder="Measure unit (oz, lb, hour)" required>
                        <input type="number" id="purchase-qty" placeholder="Purchase unit qty" step="0.001" required>
                        <input type="number" id="purchase-price" placeholder="Purchase bundle price" step="0.01" required>
                        <button type="submit">Add Material</button>
                    </form>
                </div>
                
                <div class="list-section">
                    <h3>Materials</h3>
                    <div id="materials-list">Loading...</div>
                </div>
            </div>
            
            <!-- Product Costing Tab -->
            <div id="products-tab" class="tab-content">
                <div class="form-section">
                    <h3>Add Product</h3>
                    <form id="product-form">
                        <input type="text" id="product-name" placeholder="Product name" required>
                        <input type="text" id="product-sku" placeholder="SKU (optional)">
                        <input type="number" id="batch-quantity" placeholder="Quantity produced per batch" min="1" required>
                        <button type="submit">Add Product</button>
                    </form>
                    
                    <div id="product-materials" style="display: none;">
                        <h4>Materials for this Product</h4>
                        <div id="material-lines"></div>
                        <button type="button" id="add-material-line" class="btn-secondary">Add Another Material</button>
                        <div class="cost-summary">
                            <strong>Total Batch Cost: $<span id="total-batch-cost">0.00</span></strong><br>
                            <strong>Cost Per Item: $<span id="cost-per-item">0.00</span></strong><br>
                            <button type="button" id="save-product" class="btn-primary" style="margin-top: 1rem;">Save Product</button>
                        </div>
                    </div>
                </div>
                
                <div class="list-section">
                    <h3>Products</h3>
                    <div id="products-list">Loading...</div>
                </div>
            </div>
        </div>
    </div>
  `;

  const additionalCSS = `
    <style>
        .materials-container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
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
        .form-section input, .form-section select { 
            padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; flex: 1; min-width: 150px;
        }
        .form-section button { 
            background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; 
            border-radius: 4px; cursor: pointer; white-space: nowrap;
        }
        .form-section button:hover { background: #2980b9; }
        .list-section { background: white; padding: 2rem; border-radius: 8px; }
        .item { 
            padding: 1rem; border-bottom: 1px solid #eee; display: flex; 
            justify-content: space-between; align-items: center; 
        }
        .item:last-child { border-bottom: none; }
        .item-actions { display: flex; gap: 0.5rem; }
        .edit-btn { 
            background: #f39c12; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .delete-btn { 
            background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .btn-secondary {
            background: #95a5a6; color: white; border: none; padding: 0.75rem 1.5rem;
            border-radius: 4px; cursor: pointer; margin: 1rem 0;
        }
        .material-line {
            display: flex; gap: 1rem; align-items: end; margin-bottom: 1rem;
            padding: 1rem; background: #f8f9fa; border-radius: 4px;
        }
        .material-line select, .material-line input {
            flex: 1; min-width: 120px;
        }
        .remove-line {
            background: #e74c3c; color: white; border: none; padding: 0.5rem;
            border-radius: 4px; cursor: pointer; white-space: nowrap;
        }
        .cost-summary {
            margin-top: 2rem; padding: 1rem; background: #e8f5e8; border-radius: 4px;
            text-align: center; font-size: 1.1rem;
        }
        .btn-primary {
            background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem;
            border-radius: 4px; cursor: pointer; font-weight: 500;
        }
        .btn-primary:hover { background: #2980b9; }
    </style>
  `;

  const additionalJS = `
    <script>
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Activate the corresponding button
            const buttons = document.querySelectorAll('.tab-btn');
            buttons.forEach(btn => {
                if (btn.textContent.includes(tabName === 'products' ? 'Product Costing' : 
                                           tabName === 'materials' ? 'Materials' : 'Material Categories')) {
                    btn.classList.add('active');
                }
            });
        }
        
        // Load data when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadCategories();
            loadMaterials();
            loadProducts();
            
            // Form handlers
            document.getElementById('category-form').addEventListener('submit', addCategory);
            document.getElementById('material-form').addEventListener('submit', addMaterial);
            document.getElementById('product-form').addEventListener('submit', startProduct);
            document.getElementById('add-material-line').addEventListener('click', addMaterialLine);
            document.getElementById('save-product').addEventListener('click', saveProduct);
        });
        
        async function loadCategories() {
            try {
                const response = await fetch('/api/categories');
                const categories = await response.json();
                
                // Update categories list
                const listEl = document.getElementById('categories-list');
                listEl.innerHTML = categories.map(cat => 
                    \`<div class="item">
                        <span>\${cat.name}</span>
                        <button class="delete-btn" onclick="deleteCategory(\${cat.id})">Delete</button>
                    </div>\`
                ).join('');
                
                // Update materials form dropdown
                const selectEl = document.getElementById('material-category');
                selectEl.innerHTML = '<option value="">Select Category</option>' + 
                    categories.map(cat => \`<option value="\${cat.id}">\${cat.name}</option>\`).join('');
                    
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }
        
        async function loadMaterials() {
            try {
                const response = await fetch('/api/materials');
                const materials = await response.json();
                
                const listEl = document.getElementById('materials-list');
                listEl.innerHTML = materials.map(mat => 
                    \`<div class="item">
                        <div>
                            <strong>\${mat.name}</strong> (\${mat.category_name})<br>
                            \${mat.purchase_unit_qty} \${mat.measure_unit} for $\${mat.purchase_bundle_price} = 
                            <strong>$\${mat.cost_per_unit}/\${mat.measure_unit}</strong>
                        </div>
                        <div class="item-actions">
                            <button class="edit-btn" onclick="editMaterial(\${mat.id})">Edit</button>
                            <button class="delete-btn" onclick="deleteMaterial(\${mat.id})">Delete</button>
                        </div>
                    </div>\`
                ).join('');
                    
            } catch (error) {
                console.error('Error loading materials:', error);
            }
        }
        
        async function addCategory(e) {
            e.preventDefault();
            const name = document.getElementById('category-name').value;
            
            try {
                const response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                
                if (response.ok) {
                    document.getElementById('category-name').value = '';
                    loadCategories();
                }
            } catch (error) {
                console.error('Error adding category:', error);
            }
        }
        
        async function addMaterial(e) {
            e.preventDefault();
            const form = e.target;
            const editId = form.dataset.editId;
            
            const formData = {
                category_id: document.getElementById('material-category').value,
                name: document.getElementById('material-name').value,
                measure_unit: document.getElementById('measure-unit').value,
                purchase_unit_qty: document.getElementById('purchase-qty').value,
                purchase_bundle_price: document.getElementById('purchase-price').value
            };
            
            try {
                const url = editId ? \`/api/materials/\${editId}\` : '/api/materials';
                const method = editId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    // Reset form
                    form.reset();
                    form.removeAttribute('data-edit-id');
                    form.querySelector('button[type="submit"]').textContent = 'Add Material';
                    loadMaterials();
                }
            } catch (error) {
                console.error('Error saving material:', error);
            }
        }
        
        async function deleteCategory(id) {
            if (confirm('Delete this category?')) {
                try {
                    await fetch(\`/api/categories/\${id}\`, { method: 'DELETE' });
                    loadCategories();
                } catch (error) {
                    console.error('Error deleting category:', error);
                }
            }
        }
        
        async function editMaterial(id) {
            try {
                // Get material data
                const response = await fetch(\`/api/materials/\${id}\`);
                const material = await response.json();
                
                // Fill form with current data
                document.getElementById('material-category').value = material.category_id;
                document.getElementById('material-name').value = material.name;
                document.getElementById('measure-unit').value = material.measure_unit;
                document.getElementById('purchase-qty').value = material.purchase_unit_qty;
                document.getElementById('purchase-price').value = material.purchase_bundle_price;
                
                // Change form to edit mode
                const form = document.getElementById('material-form');
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Update Material';
                form.dataset.editId = id;
                
                // Switch to materials tab
                showTab('materials');
                
            } catch (error) {
                console.error('Error loading material for edit:', error);
            }
        }
        
        async function deleteMaterial(id) {
            if (confirm('Delete this material?')) {
                try {
                    await fetch(\`/api/materials/\${id}\`, { method: 'DELETE' });
                    loadMaterials();
                } catch (error) {
                    console.error('Error deleting material:', error);
                }
            }
        }
        
        // Product costing functions
        let currentProduct = null;
        let materialLines = [];
        
        async function loadProducts() {
            try {
                const response = await fetch('/api/products');
                const data = await response.json();
                const products = data.products || data; // Handle both paginated and simple array
                
                const listEl = document.getElementById('products-list');
                listEl.innerHTML = products.map(prod => 
                    \`<div class="item">
                        <div>
                            <strong>\${prod.title}</strong> \${prod.sku ? '(' + prod.sku + ')' : ''}<br>
                            Batch Size: \${prod.batch_quantity} | Cost Per Item: <strong>$\${prod.cost_per_item || '0.00'}</strong>
                        </div>
                        <div class="item-actions">
                            <button class="edit-btn" onclick="editCostingProduct(\${prod.id})">Edit Costing</button>
                            <button class="delete-btn" onclick="deleteProduct(\${prod.id})">Delete</button>
                        </div>
                    </div>\`
                ).join('');
                    
            } catch (error) {
                console.error('Error loading products:', error);
            }
        }
        
        function startProduct(e) {
            e.preventDefault();
            const name = document.getElementById('product-name').value;
            const sku = document.getElementById('product-sku').value;
            const batchQty = document.getElementById('batch-quantity').value;
            
            currentProduct = { name, sku, batch_quantity: batchQty };
            materialLines = [];
            
            document.getElementById('product-materials').style.display = 'block';
            addMaterialLine();
            calculateCosts();
        }
        
        function addMaterialLine() {
            const lineId = Date.now();
            const lineHtml = \`
                <div class="material-line" data-line-id="\${lineId}">
                    <select class="category-select" onchange="loadMaterialsForCategory(this, \${lineId})">
                        <option value="">Select Category</option>
                    </select>
                    <select class="material-select" onchange="updateMaterialLine(\${lineId})" disabled>
                        <option value="">Select Material</option>
                    </select>
                    <input type="number" class="quantity-input" placeholder="Quantity" step="0.001" 
                           onchange="updateMaterialLine(\${lineId})" disabled>
                    <span class="unit-display">-</span>
                    <span class="cost-display">$0.00</span>
                    <button type="button" class="remove-line" onclick="removeMaterialLine(\${lineId})">Remove</button>
                </div>
            \`;
            
            document.getElementById('material-lines').insertAdjacentHTML('beforeend', lineHtml);
            
            // Populate categories
            loadCategoriesForLine(lineId);
        }
        
        async function loadCategoriesForLine(lineId) {
            try {
                const response = await fetch('/api/categories');
                const categories = await response.json();
                
                const select = document.querySelector(\`[data-line-id="\${lineId}"] .category-select\`);
                select.innerHTML = '<option value="">Select Category</option>' + 
                    categories.map(cat => \`<option value="\${cat.id}">\${cat.name}</option>\`).join('');
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }
        
        async function loadMaterialsForCategory(categorySelect, lineId) {
            const categoryId = categorySelect.value;
            const materialSelect = document.querySelector(\`[data-line-id="\${lineId}"] .material-select\`);
            const quantityInput = document.querySelector(\`[data-line-id="\${lineId}"] .quantity-input\`);
            
            if (!categoryId) {
                materialSelect.innerHTML = '<option value="">Select Material</option>';
                materialSelect.disabled = true;
                quantityInput.disabled = true;
                return;
            }
            
            try {
                const response = await fetch(\`/api/materials?category_id=\${categoryId}\`);
                const materials = await response.json();
                
                materialSelect.innerHTML = '<option value="">Select Material</option>' + 
                    materials.map(mat => \`<option value="\${mat.id}" data-cost="\${mat.cost_per_unit}" data-unit="\${mat.measure_unit}">\${mat.name}</option>\`).join('');
                materialSelect.disabled = false;
            } catch (error) {
                console.error('Error loading materials:', error);
            }
        }
        
        function updateMaterialLine(lineId) {
            const line = document.querySelector(\`[data-line-id="\${lineId}"]\`);
            const materialSelect = line.querySelector('.material-select');
            const quantityInput = line.querySelector('.quantity-input');
            const unitDisplay = line.querySelector('.unit-display');
            const costDisplay = line.querySelector('.cost-display');
            
            const selectedOption = materialSelect.selectedOptions[0];
            if (selectedOption && selectedOption.value) {
                const cost = parseFloat(selectedOption.dataset.cost);
                const unit = selectedOption.dataset.unit;
                const quantity = parseFloat(quantityInput.value) || 0;
                
                unitDisplay.textContent = unit;
                quantityInput.disabled = false;
                
                const lineCost = cost * quantity;
                costDisplay.textContent = '$' + lineCost.toFixed(2);
                
                // Update material lines array
                const existingIndex = materialLines.findIndex(m => m.lineId === lineId);
                const materialData = {
                    lineId,
                    material_id: selectedOption.value,
                    quantity,
                    cost_per_unit: cost,
                    line_cost: lineCost
                };
                
                if (existingIndex >= 0) {
                    materialLines[existingIndex] = materialData;
                } else {
                    materialLines.push(materialData);
                }
            } else {
                unitDisplay.textContent = '-';
                costDisplay.textContent = '$0.00';
                quantityInput.disabled = true;
            }
            
            calculateCosts();
        }
        
        function removeMaterialLine(lineId) {
            document.querySelector(\`[data-line-id="\${lineId}"]\`).remove();
            materialLines = materialLines.filter(m => m.lineId !== lineId);
            calculateCosts();
        }
        
        function calculateCosts() {
            const totalBatchCost = materialLines.reduce((sum, line) => sum + (parseFloat(line.line_cost) || 0), 0);
            const batchQuantity = parseInt(currentProduct?.batch_quantity) || 1;
            const costPerItem = totalBatchCost / batchQuantity;
            
            document.getElementById('total-batch-cost').textContent = totalBatchCost.toFixed(2);
            document.getElementById('cost-per-item').textContent = costPerItem.toFixed(2);
        }
        
        async function saveProduct() {
            if (!currentProduct || materialLines.length === 0) {
                alert('Please add at least one material before saving.');
                return;
            }
            
            const totalBatchCost = materialLines.reduce((sum, line) => sum + (line.line_cost || 0), 0);
            const costPerItem = totalBatchCost / parseInt(currentProduct.batch_quantity);
            
            const productData = {
                name: currentProduct.name,
                sku: currentProduct.sku || null,
                batch_quantity: parseInt(currentProduct.batch_quantity),
                total_batch_cost: totalBatchCost,
                cost_per_item: costPerItem,
                materials: materialLines.map(line => ({
                    material_id: parseInt(line.material_id),
                    quantity: parseFloat(line.quantity),
                    cost_per_unit: parseFloat(line.cost_per_unit),
                    line_cost: parseFloat(line.line_cost)
                }))
            };
            
            try {
                const url = currentProduct.id ? '/api/products/' + currentProduct.id : '/api/products';
                const method = currentProduct.id ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                
                if (response.ok) {
                    alert(currentProduct.id ? 'Product updated successfully!' : 'Product saved successfully!');
                    
                    // Reset form
                    document.getElementById('product-form').reset();
                    document.getElementById('product-materials').style.display = 'none';
                    document.getElementById('material-lines').innerHTML = '';
                    document.getElementById('save-product').textContent = 'Save Product';
                    currentProduct = null;
                    materialLines = [];
                    
                    loadProducts();
                } else {
                    const error = await response.json();
                    alert('Error saving product: ' + error.error);
                }
            } catch (error) {
                console.error('Error saving product:', error);
                throw error;
            }
        }
        
        async function editCostingProduct(id) {
            try {
                const response = await fetch('/api/products/' + id + '/materials');
                const productData = await response.json();
                
                // Populate form
                document.getElementById('product-name').value = productData.title || '';
                document.getElementById('product-sku').value = productData.sku || '';
                document.getElementById('batch-quantity').value = productData.batch_quantity || '';
                
                // Set editing mode
                currentProduct = { 
                    id: id,
                    name: productData.title,
                    sku: productData.sku,
                    batch_quantity: productData.batch_quantity
                };
                
                // Clear and rebuild material lines
                materialLines = [];
                document.getElementById('material-lines').innerHTML = '';
                document.getElementById('product-materials').style.display = 'block';
                
                // Add existing materials
                for (const material of productData.materials || []) {
                    const lineId = Date.now() + Math.random();
                    materialLines.push({
                        lineId,
                        material_id: material.material_id,
                        quantity: material.quantity,
                        cost_per_unit: material.cost_per_unit,
                        line_cost: material.line_cost
                    });
                    
                    // Create populated line
                    const lineHtml = 
                        '<div class="material-line" data-line-id="' + lineId + '">' +
                            '<select class="category-select" disabled>' +
                                '<option>' + material.category_name + '</option>' +
                            '</select>' +
                            '<select class="material-select" disabled>' +
                                '<option>' + material.material_name + '</option>' +
                            '</select>' +
                            '<input type="number" class="quantity-input" value="' + material.quantity + '" ' +
                                   'onchange="updateMaterialLine(' + lineId + ')">' +
                            '<span class="unit-display">' + (material.measure_unit || 'unit') + '</span>' +
                            '<span class="cost-display">$' + parseFloat(material.line_cost).toFixed(2) + '</span>' +
                            '<button type="button" class="remove-line" onclick="removeMaterialLine(' + lineId + ')">Remove</button>' +
                        '</div>';
                    document.getElementById('material-lines').insertAdjacentHTML('beforeend', lineHtml);
                }
                
                document.getElementById('save-product').textContent = 'Update Product';
                calculateCosts();
                showTab('products');
                
            } catch (error) {
                console.error('Error loading product for editing:', error);
                throw error;
            }
        }
        
        async function deleteProduct(id) {
            if (confirm('Delete this product?')) {
                try {
                    await fetch(\`/api/products/\${id}\`, { method: 'DELETE' });
                    loadProducts();
                } catch (error) {
                    console.error('Error deleting product:', error);
                }
            }
        }
    </script>
  `;

  return createLayout({
    title: 'Materials - Luca Platform',
    currentPath: '/costing/materials',
    content,
    additionalCSS,
    additionalJS
  });
}

module.exports = { createMaterialsPage };
