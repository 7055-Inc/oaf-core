const { createLayout } = require('../components/layout');

function createProductsPage() {
  const content = `
    <div class="content-area">
        <div class="products-container">
            <h1>Product Management</h1>
            
            <!-- Product Form -->
            <div class="form-section">
                <h3 id="form-title">Add New Product</h3>
                <form id="product-form">
                    <input type="hidden" id="product-id" value="">
                    
                    <!-- Basic Information -->
                    <div class="form-group">
                        <h4>Basic Information</h4>
                        <div class="form-row">
                            <input type="text" id="product-title" placeholder="Product Title" required>
                            <select id="product-collection">
                                <option value="">Select Collection</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <input type="text" id="product-sku" placeholder="SKU">
                            <input type="text" id="product-upc" placeholder="UPC">
                        </div>
                    </div>
                    
                    <!-- Brand & Category -->
                    <div class="form-group">
                        <h4>Brand & Category</h4>
                        <div class="form-row">
                            <input type="text" id="product-brand" placeholder="Brand">
                            <input type="text" id="product-manufacturer" placeholder="Manufacturer">
                        </div>
                        <div class="form-row">
                            <input type="text" id="product-model" placeholder="Model/Part Number">
                            <input type="text" id="product-category" placeholder="Main Category">
                        </div>
                        <div class="form-row">
                            <select id="product-condition">
                                <option value="New">New</option>
                                <option value="Used">Used</option>
                                <option value="Refurbished">Refurbished</option>
                            </select>
                            <input type="text" id="product-country" placeholder="Country of Origin">
                        </div>
                    </div>
                    
                    <!-- Demographics -->
                    <div class="form-group">
                        <h4>Target Demographics</h4>
                        <div class="form-row">
                            <select id="product-age-group">
                                <option value="All Ages">All Ages</option>
                                <option value="Adult">Adult</option>
                                <option value="Teen">Teen</option>
                                <option value="Child">Child</option>
                                <option value="Baby">Baby</option>
                            </select>
                            <select id="product-gender">
                                <option value="Unisex">Unisex</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Dimensions & Weight -->
                    <div class="form-group">
                        <h4>Physical Properties</h4>
                        <div class="form-row">
                            <input type="number" id="product-height" placeholder="Height" step="0.01">
                            <input type="number" id="product-width" placeholder="Width" step="0.01">
                            <input type="number" id="product-depth" placeholder="Depth" step="0.01">
                            <select id="dimension-unit">
                                <option value="in">Inches</option>
                                <option value="ft">Feet</option>
                                <option value="cm">Centimeters</option>
                                <option value="m">Meters</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <input type="number" id="product-weight" placeholder="Weight" step="0.01">
                            <select id="weight-unit">
                                <option value="lb">Pounds</option>
                                <option value="oz">Ounces</option>
                                <option value="kg">Kilograms</option>
                                <option value="g">Grams</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Pricing -->
                    <div class="form-group">
                        <h4>Pricing</h4>
                        <div class="form-row">
                            <input type="number" id="product-msrp" placeholder="MSRP" step="0.01">
                            <input type="number" id="product-map" placeholder="MAP Price" step="0.01">
                        </div>
                    </div>
                    
                    <!-- Materials & Production -->
                    <div class="form-group">
                        <h4>Materials & Production</h4>
                        <div class="form-row">
                            <input type="number" id="batch-quantity" placeholder="Batch Quantity" required>
                        </div>
                        <textarea id="materials-used" placeholder="Materials Used" rows="3"></textarea>
                        <textarea id="material-composition" placeholder="Material Composition (%)" rows="2"></textarea>
                    </div>
                    
                    <!-- Marketing & Features -->
                    <div class="form-group">
                        <h4>Marketing & Features</h4>
                        <textarea id="product-keywords" placeholder="Keywords/Search Terms" rows="2"></textarea>
                        <div class="form-row">
                            <input type="text" id="holiday-occasion" placeholder="Holiday/Occasion">
                            <label class="checkbox-label">
                                <input type="checkbox" id="gift-wrappable"> Gift Wrappable
                            </label>
                        </div>
                    </div>
                    
                    <!-- Compliance & Safety -->
                    <div class="form-group">
                        <h4>Compliance & Safety</h4>
                        <div class="form-row">
                            <input type="number" id="age-restriction" placeholder="Age Restriction (years)" min="0">
                            <input type="text" id="certifications" placeholder="Certifications (CE, FCC, etc.)">
                        </div>
                        <textarea id="safety-warnings" placeholder="Safety Warnings" rows="2"></textarea>
                    </div>
                    
                    <!-- Variants Section -->
                    <div class="form-group">
                        <h4>Product Variants</h4>
                        <div class="variants-section">
                            <div class="metrics-container">
                                <h5>Variant Metrics</h5>
                                <div class="add-metric">
                                    <input type="text" id="new-metric" placeholder="Metric name (e.g., Color, Size)">
                                    <button type="button" onclick="addMetric()">Add Metric</button>
                                </div>
                                <div id="metrics-list"></div>
                            </div>
                            
                            <div class="combinations-container">
                                <h5>Variant Combinations</h5>
                                <div id="combinations-list"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Custom Fields -->
                    <div class="form-group">
                        <h4>Custom Fields</h4>
                        <div class="custom-fields-container">
                            <div class="add-custom-field">
                                <input type="text" id="custom-field-name" placeholder="Field Name">
                                <select id="custom-field-type">
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Yes/No</option>
                                    <option value="date">Date</option>
                                </select>
                                <button type="button" onclick="addCustomField()">Add Field</button>
                            </div>
                            <div id="custom-fields-list"></div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" id="save-btn">Save Product</button>
                        <button type="button" onclick="resetForm()">Cancel</button>
                    </div>
                </form>
            </div>
            
            <!-- Products List -->
            <div class="list-section">
                <h3>Products</h3>
                <div class="filter-controls">
                    <select id="collection-filter" onchange="filterProducts()">
                        <option value="">All Collections</option>
                    </select>
                    <select id="status-filter" onchange="filterProducts()">
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div id="products-list">Loading...</div>
            </div>
        </div>
    </div>
  `;

  const additionalCSS = `
    <style>
        .products-container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .form-section { 
            background: #f8f9fa; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; 
        }
        .form-group { 
            margin-bottom: 2rem; padding: 1.5rem; background: white; border-radius: 6px; 
        }
        .form-group h4 { 
            margin: 0 0 1rem 0; color: #2c3e50; border-bottom: 2px solid #3498db; 
            padding-bottom: 0.5rem; 
        }
        .form-row { 
            display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; 
        }
        .form-row input, .form-row select, .form-row textarea { 
            flex: 1; min-width: 200px; padding: 0.75rem; border: 1px solid #ddd; 
            border-radius: 4px; 
        }
        textarea { 
            width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; 
            resize: vertical; 
        }
        .checkbox-label { 
            display: flex; align-items: center; gap: 0.5rem; min-width: auto; 
            padding: 0; border: none; 
        }
        .variants-section { 
            display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; 
        }
        .metrics-container, .combinations-container { 
            background: #f8f9fa; padding: 1rem; border-radius: 4px; 
        }
        .add-metric, .add-custom-field { 
            display: flex; gap: 0.5rem; margin-bottom: 1rem; 
        }
        .add-metric input, .add-custom-field input, .add-custom-field select { 
            flex: 1; 
        }
        .add-metric button, .add-custom-field button { 
            background: #3498db; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; white-space: nowrap; 
        }
        .metric-item, .custom-field-item { 
            background: white; padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px; 
            border: 1px solid #eee; 
        }
        .metric-header { 
            display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem; 
        }
        .metric-name { 
            font-weight: 500; color: #2c3e50; 
        }
        .delete-metric { 
            background: #e74c3c; color: white; border: none; padding: 0.25rem 0.5rem; 
            border-radius: 3px; cursor: pointer; font-size: 0.8rem; 
        }
        .options-container { 
            display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; 
        }
        .option-tag { 
            background: #3498db; color: white; padding: 0.25rem 0.5rem; border-radius: 3px; 
            font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; 
        }
        .remove-option { 
            background: none; border: none; color: white; cursor: pointer; font-weight: bold; 
        }
        .add-option { 
            display: flex; gap: 0.5rem; margin-top: 0.5rem; 
        }
        .add-option input { 
            flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 3px; 
        }
        .add-option button { 
            background: #27ae60; color: white; border: none; padding: 0.5rem; 
            border-radius: 3px; cursor: pointer; 
        }
        .combination-item { 
            background: white; padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px; 
            border: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; 
        }
        .combination-options { 
            font-size: 0.9rem; color: #666; 
        }
        .create-variant { 
            background: #27ae60; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .form-actions { 
            display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; 
        }
        .form-actions button { 
            padding: 1rem 2rem; border: none; border-radius: 4px; cursor: pointer; 
            font-weight: 500; 
        }
        #save-btn { 
            background: #27ae60; color: white; 
        }
        #save-btn:hover { 
            background: #219a52; 
        }
        .form-actions button[type="button"] { 
            background: #95a5a6; color: white; 
        }
        .list-section { 
            background: white; padding: 2rem; border-radius: 8px; 
        }
        .filter-controls { 
            display: flex; gap: 1rem; margin-bottom: 2rem; 
        }
        .filter-controls select { 
            padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; 
        }
        .product-item { 
            padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; 
            justify-content: space-between; align-items: center; 
        }
        .product-info h4 { 
            margin: 0 0 0.5rem 0; color: #2c3e50; 
        }
        .product-info p { 
            margin: 0; color: #666; font-size: 0.9rem; 
        }
        .product-actions { 
            display: flex; gap: 0.5rem; 
        }
        .edit-btn { 
            background: #f39c12; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .delete-btn { 
            background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        
        @media (max-width: 768px) {
            .variants-section { grid-template-columns: 1fr; }
            .form-row { flex-direction: column; }
            .product-item { flex-direction: column; align-items: flex-start; gap: 1rem; }
        }
    </style>
  `;

  const additionalJS = `
    <script>
        let currentMetrics = [];
        let currentCombinations = [];
        let customFields = [];
        
        document.addEventListener('DOMContentLoaded', function() {
            loadCollections();
            loadProducts();
            
            // Check if we're editing a product
            const urlParams = new URLSearchParams(window.location.search);
            const editId = urlParams.get('edit');
            if (editId) {
                loadProductForEdit(editId);
            }
            
            document.getElementById('product-form').addEventListener('submit', saveProduct);
        });
        
        async function loadCollections() {
            try {
                const response = await fetch('/api/collections');
                const collections = await response.json();
                
                const selects = ['product-collection', 'collection-filter'];
                selects.forEach(selectId => {
                    const select = document.getElementById(selectId);
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">Select Collection</option>' + 
                        collections.map(col => \`<option value="\${col.id}">\${col.name}</option>\`).join('');
                    select.value = currentValue;
                });
            } catch (error) {
                console.error('Error loading collections:', error);
            }
        }
        
        async function loadProducts() {
            try {
                const response = await fetch('/api/products/full');
                const products = await response.json();
                
                const listEl = document.getElementById('products-list');
                listEl.innerHTML = products.map(prod => 
                    \`<div class="product-item">
                        <div class="product-info">
                            <h4>\${prod.title} \${prod.sku ? '(' + prod.sku + ')' : ''}</h4>
                            <p>Collection: \${prod.collection_name || 'None'} | Brand: \${prod.brand || 'N/A'} | Status: \${prod.status}</p>
                            <p>Batch: \${prod.batch_quantity} | Cost: $\${prod.cost_per_item} | MSRP: $\${prod.msrp || 'N/A'}</p>
                        </div>
                        <div class="product-actions">
                            <button class="edit-btn" onclick="editProduct(\${prod.id})">Edit</button>
                            <button class="delete-btn" onclick="deleteProduct(\${prod.id})">Delete</button>
                        </div>
                    </div>\`
                ).join('');
            } catch (error) {
                console.error('Error loading products:', error);
            }
        }
        
        async function loadProductForEdit(productId) {
            try {
                const response = await fetch(\`/api/products/full/\${productId}\`);
                const product = await response.json();
                
                // Populate form fields
                document.getElementById('product-id').value = product.id;
                document.getElementById('product-title').value = product.title || '';
                document.getElementById('product-collection').value = product.collection_id || '';
                document.getElementById('product-sku').value = product.sku || '';
                document.getElementById('product-upc').value = product.upc || '';
                document.getElementById('product-brand').value = product.brand || '';
                document.getElementById('product-manufacturer').value = product.manufacturer || '';
                document.getElementById('product-model').value = product.model_number || '';
                document.getElementById('product-category').value = product.main_category || '';
                document.getElementById('product-condition').value = product.condition_type || 'New';
                document.getElementById('product-country').value = product.country_origin || '';
                document.getElementById('product-age-group').value = product.age_group || 'All Ages';
                document.getElementById('product-gender').value = product.gender || 'Unisex';
                document.getElementById('product-height').value = product.height || '';
                document.getElementById('product-width').value = product.width || '';
                document.getElementById('product-depth').value = product.depth || '';
                document.getElementById('dimension-unit').value = product.dimension_unit || 'in';
                document.getElementById('product-weight').value = product.weight || '';
                document.getElementById('weight-unit').value = product.weight_unit || 'lb';
                document.getElementById('product-msrp').value = product.msrp || '';
                document.getElementById('product-map').value = product.map_price || '';
                document.getElementById('batch-quantity').value = product.batch_quantity || '';
                document.getElementById('materials-used').value = product.materials_used || '';
                document.getElementById('material-composition').value = product.material_composition || '';
                document.getElementById('product-keywords').value = product.keywords || '';
                document.getElementById('holiday-occasion').value = product.holiday_occasion || '';
                document.getElementById('gift-wrappable').checked = product.gift_wrappable || false;
                document.getElementById('age-restriction').value = product.age_restriction || 0;
                document.getElementById('certifications').value = product.certifications || '';
                document.getElementById('safety-warnings').value = product.safety_warnings || '';
                
                // Load custom fields and metrics
                customFields = product.custom_fields || [];
                currentMetrics = product.metrics || [];
                
                renderCustomFields();
                renderMetrics();
                updateCombinations();
                
                // Update form title
                document.getElementById('form-title').textContent = 'Edit Product: ' + product.title;
                
            } catch (error) {
                console.error('Error loading product for edit:', error);
                alert('Error loading product for editing');
            }
        }
        
        function addMetric() {
            const metricName = document.getElementById('new-metric').value.trim();
            if (!metricName) return;
            
            const metric = {
                id: Date.now(),
                name: metricName,
                options: []
            };
            
            currentMetrics.push(metric);
            document.getElementById('new-metric').value = '';
            renderMetrics();
            updateCombinations();
        }
        
        function renderMetrics() {
            const container = document.getElementById('metrics-list');
            container.innerHTML = currentMetrics.map(metric => 
                \`<div class="metric-item">
                    <div class="metric-header">
                        <span class="metric-name">\${metric.name}</span>
                        <button class="delete-metric" onclick="removeMetric(\${metric.id})">×</button>
                    </div>
                    <div class="options-container">
                        \${metric.options.map(option => 
                            \`<span class="option-tag">
                                \${option}
                                <button class="remove-option" onclick="removeOption(\${metric.id}, '\${option}')">×</button>
                            </span>\`
                        ).join('')}
                    </div>
                    <div class="add-option">
                        <input type="text" placeholder="Add option" onkeypress="if(event.key==='Enter') addOption(\${metric.id}, this)">
                        <button onclick="addOption(\${metric.id}, this.previousElementSibling)">Add</button>
                    </div>
                </div>\`
            ).join('');
        }
        
        function addOption(metricId, input) {
            const option = input.value.trim();
            if (!option) return;
            
            const metric = currentMetrics.find(m => m.id === metricId);
            if (metric && !metric.options.includes(option)) {
                metric.options.push(option);
                input.value = '';
                renderMetrics();
                updateCombinations();
            }
        }
        
        function removeOption(metricId, option) {
            const metric = currentMetrics.find(m => m.id === metricId);
            if (metric) {
                metric.options = metric.options.filter(o => o !== option);
                renderMetrics();
                updateCombinations();
            }
        }
        
        function removeMetric(metricId) {
            currentMetrics = currentMetrics.filter(m => m.id !== metricId);
            renderMetrics();
            updateCombinations();
        }
        
        function updateCombinations() {
            const metricsWithOptions = currentMetrics.filter(m => m.options.length > 0);
            if (metricsWithOptions.length === 0) {
                document.getElementById('combinations-list').innerHTML = '<p>Add metrics and options to see combinations</p>';
                return;
            }
            
            // Generate all combinations
            const combinations = generateCombinations(metricsWithOptions);
            
            const container = document.getElementById('combinations-list');
            container.innerHTML = combinations.map(combo => 
                \`<div class="combination-item">
                    <div class="combination-options">\${combo.join(' • ')}</div>
                    <button class="create-variant" onclick="createVariant('\${combo.join('|')}')">Create</button>
                </div>\`
            ).join('');
        }
        
        function generateCombinations(metrics) {
            if (metrics.length === 0) return [];
            if (metrics.length === 1) return metrics[0].options.map(opt => [opt]);
            
            const [first, ...rest] = metrics;
            const restCombinations = generateCombinations(rest);
            
            const combinations = [];
            for (const option of first.options) {
                for (const restCombo of restCombinations) {
                    combinations.push([option, ...restCombo]);
                }
            }
            return combinations;
        }
        
        function createVariant(comboString) {
            // TODO: Implement variant creation
            alert('Variant creation: ' + comboString);
        }
        
        function addCustomField() {
            const name = document.getElementById('custom-field-name').value.trim();
            const type = document.getElementById('custom-field-type').value;
            
            if (!name) return;
            
            const field = {
                id: Date.now(),
                name: name,
                type: type,
                value: ''
            };
            
            customFields.push(field);
            document.getElementById('custom-field-name').value = '';
            renderCustomFields();
        }
        
        function renderCustomFields() {
            const container = document.getElementById('custom-fields-list');
            container.innerHTML = customFields.map(field => 
                \`<div class="custom-field-item">
                    <label>\${field.name}:</label>
                    \${getCustomFieldInput(field)}
                    <button class="delete-metric" onclick="removeCustomField(\${field.id})">×</button>
                </div>\`
            ).join('');
        }
        
        function getCustomFieldInput(field) {
            switch (field.type) {
                case 'number':
                    return \`<input type="number" value="\${field.value}" onchange="updateCustomField(\${field.id}, this.value)">\`;
                case 'boolean':
                    return \`<input type="checkbox" \${field.value ? 'checked' : ''} onchange="updateCustomField(\${field.id}, this.checked)">\`;
                case 'date':
                    return \`<input type="date" value="\${field.value}" onchange="updateCustomField(\${field.id}, this.value)">\`;
                default:
                    return \`<input type="text" value="\${field.value}" onchange="updateCustomField(\${field.id}, this.value)">\`;
            }
        }
        
        function updateCustomField(fieldId, value) {
            const field = customFields.find(f => f.id === fieldId);
            if (field) {
                field.value = value;
            }
        }
        
        function removeCustomField(fieldId) {
            customFields = customFields.filter(f => f.id !== fieldId);
            renderCustomFields();
        }
        
        async function saveProduct(e) {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('product-title').value,
                collection_id: document.getElementById('product-collection').value || null,
                sku: document.getElementById('product-sku').value,
                upc: document.getElementById('product-upc').value,
                brand: document.getElementById('product-brand').value,
                manufacturer: document.getElementById('product-manufacturer').value,
                model_number: document.getElementById('product-model').value,
                main_category: document.getElementById('product-category').value,
                condition_type: document.getElementById('product-condition').value,
                country_origin: document.getElementById('product-country').value,
                age_group: document.getElementById('product-age-group').value,
                gender: document.getElementById('product-gender').value,
                height: document.getElementById('product-height').value || null,
                width: document.getElementById('product-width').value || null,
                depth: document.getElementById('product-depth').value || null,
                dimension_unit: document.getElementById('dimension-unit').value,
                weight: document.getElementById('product-weight').value || null,
                weight_unit: document.getElementById('weight-unit').value,
                msrp: document.getElementById('product-msrp').value || null,
                map_price: document.getElementById('product-map').value || null,
                batch_quantity: document.getElementById('batch-quantity').value,
                materials_used: document.getElementById('materials-used').value,
                material_composition: document.getElementById('material-composition').value,
                keywords: document.getElementById('product-keywords').value,
                holiday_occasion: document.getElementById('holiday-occasion').value,
                gift_wrappable: document.getElementById('gift-wrappable').checked,
                age_restriction: document.getElementById('age-restriction').value || 0,
                certifications: document.getElementById('certifications').value,
                safety_warnings: document.getElementById('safety-warnings').value,
                custom_fields: customFields,
                metrics: currentMetrics
            };
            
            try {
                const productId = document.getElementById('product-id').value;
                const url = productId ? \`/api/products/\${productId}\` : '/api/products/full';
                const method = productId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    resetForm();
                    loadProducts();
                    alert('Product saved successfully!');
                }
            } catch (error) {
                console.error('Error saving product:', error);
                alert('Error saving product');
            }
        }
        
        function resetForm() {
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = '';
            document.getElementById('form-title').textContent = 'Add New Product';
            currentMetrics = [];
            customFields = [];
            renderMetrics();
            renderCustomFields();
            updateCombinations();
        }
        
        async function editProduct(id) {
            // TODO: Load product data and populate form
            alert('Edit product: ' + id);
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
        
        function filterProducts() {
            // TODO: Implement filtering
            loadProducts();
        }
    </script>
  `;

  return createLayout({
    title: 'Products - Luca Platform',
    currentPath: '/products',
    content,
    additionalCSS,
    additionalJS
  });
}

module.exports = { createProductsPage };
