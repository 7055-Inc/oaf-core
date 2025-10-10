const { createLayout } = require('../components/layout');

function createShippingPage() {
  const content = `
    <div class="content-area">
        <div class="shipping-container">
            <h1>Shipping Management</h1>
            
            <!-- Tab Navigation -->
            <div class="tab-nav">
                <button class="tab-btn active" onclick="showTab('materials')">Packing Materials</button>
                <button class="tab-btn" onclick="showTab('products')">Product Shipping</button>
            </div>
            
            <!-- Packing Materials Tab -->
            <div id="materials-tab" class="tab-content active">
                <!-- Material Groups Section -->
                <div class="form-section">
                    <h3>Material Groups</h3>
                    <form id="group-form">
                        <input type="text" id="group-name" placeholder="Group name (e.g., Boxes, Padding)" required>
                        <input type="text" id="group-description" placeholder="Description (optional)">
                        <button type="submit">Add Group</button>
                    </form>
                    <div id="groups-list" class="mini-list">Loading...</div>
                </div>
                
                <!-- Packing Materials Section -->
                <div class="form-section">
                    <h3>Add Packing Material</h3>
                    <form id="packing-material-form">
                        <select id="material-group" required>
                            <option value="">Select Group</option>
                        </select>
                        <input type="text" id="packing-material-name" placeholder="Material name" required>
                        <input type="text" id="packing-measure-unit" placeholder="Measure unit (each, ft, roll)" required>
                        <input type="number" id="packing-purchase-qty" placeholder="Purchase unit qty" step="0.001" required>
                        <input type="number" id="packing-purchase-price" placeholder="Purchase bundle price" step="0.01" required>
                        <button type="submit">Add Material</button>
                    </form>
                </div>
                
                <div class="list-section">
                    <h3>Packing Materials</h3>
                    <div id="packing-materials-list">Loading...</div>
                </div>
            </div>
            
            <!-- Product Shipping Tab -->
            <div id="products-tab" class="tab-content">
                <div class="list-section">
                    <h3>Products - Shipping Setup</h3>
                    <div class="filter-section">
                        <select id="collection-filter" onchange="filterProducts()">
                            <option value="">All Collections</option>
                        </select>
                    </div>
                    <div id="shipping-products-list">Loading...</div>
                </div>
                
                <!-- Package Editor Modal -->
                <div id="package-editor" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="editor-title">Edit Shipping Packages</h3>
                            <button class="close-btn" onclick="closePackageEditor()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="package-count-section">
                                <label>Number of Packages:</label>
                                <select id="package-count" onchange="updatePackageCount()">
                                    <option value="1">1 Package</option>
                                    <option value="2">2 Packages</option>
                                    <option value="3">3 Packages</option>
                                    <option value="4">4 Packages</option>
                                    <option value="5">5 Packages</option>
                                    <option value="6">6 Packages</option>
                                    <option value="7">7 Packages</option>
                                    <option value="8">8 Packages</option>
                                    <option value="9">9 Packages</option>
                                    <option value="10">10 Packages</option>
                                </select>
                            </div>
                            
                            <div id="packages-container"></div>
                            
                            <div class="modal-actions">
                                <button class="btn-primary" onclick="savePackages()">Save Packages</button>
                                <button class="btn-secondary" onclick="closePackageEditor()">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

  const additionalCSS = `
    <style>
        .shipping-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
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
        .mini-list { 
            margin-top: 1rem; max-height: 200px; overflow-y: auto; 
            background: white; border-radius: 4px; padding: 1rem;
        }
        .mini-item { 
            padding: 0.5rem; border-bottom: 1px solid #eee; display: flex; 
            justify-content: space-between; align-items: center; 
        }
        .mini-item:last-child { border-bottom: none; }
        .list-section { background: white; padding: 2rem; border-radius: 8px; }
        .filter-section {
            background: #f8f9fa; padding: 1rem 2rem; border-radius: 8px; margin-bottom: 2rem;
        }
        .filter-section select {
            padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-width: 200px;
        }
        .item { 
            padding: 1.5rem; border-bottom: 1px solid #eee; display: flex; 
            justify-content: space-between; align-items: center; 
        }
        .item:last-child { border-bottom: none; }
        .item-info h4 { margin: 0 0 0.5rem 0; color: #2c3e50; }
        .item-info p { margin: 0; color: #666; font-size: 0.9rem; }
        .item-actions { display: flex; gap: 0.5rem; }
        .edit-btn { 
            background: #f39c12; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        .delete-btn { 
            background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; 
        }
        
        /* Modal Styles */
        .modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 1000; display: flex;
            align-items: center; justify-content: center;
        }
        .modal-content {
            background: white; border-radius: 8px; max-width: 90vw; max-height: 90vh;
            overflow-y: auto; min-width: 800px;
        }
        .modal-header {
            padding: 1.5rem; border-bottom: 1px solid #eee; display: flex;
            justify-content: space-between; align-items: center;
        }
        .modal-header h3 { margin: 0; }
        .close-btn {
            background: none; border: none; font-size: 1.5rem; cursor: pointer;
            color: #666; padding: 0; width: 30px; height: 30px;
        }
        .modal-body { padding: 2rem; }
        .package-count-section {
            margin-bottom: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;
        }
        .package-count-section label { font-weight: 500; margin-right: 1rem; }
        .package-count-section select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
        
        .package-item {
            border: 1px solid #ddd; border-radius: 8px; margin-bottom: 2rem; padding: 1.5rem;
            background: #fafafa;
        }
        .package-header { 
            font-weight: 500; color: #2c3e50; margin-bottom: 1rem; 
            border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;
        }
        .dimensions-row {
            display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;
        }
        .dimensions-row input, .dimensions-row select {
            padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;
        }
        .materials-section {
            margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ddd;
        }
        .material-line {
            display: grid; grid-template-columns: 2fr 2fr 1fr 1fr auto; gap: 1rem; 
            align-items: end; margin-bottom: 1rem; padding: 1rem; 
            background: white; border-radius: 4px;
        }
        .material-line select, .material-line input {
            padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;
        }
        .add-material-btn {
            background: #27ae60; color: white; border: none; padding: 0.5rem 1rem;
            border-radius: 4px; cursor: pointer; margin-top: 1rem;
        }
        .remove-material-btn {
            background: #e74c3c; color: white; border: none; padding: 0.5rem;
            border-radius: 4px; cursor: pointer;
        }
        
        .modal-actions {
            margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee;
            display: flex; gap: 1rem; justify-content: flex-end;
        }
        .btn-primary {
            background: #3498db; color: white; border: none; padding: 1rem 2rem;
            border-radius: 4px; cursor: pointer; font-weight: 500;
        }
        .btn-secondary {
            background: #95a5a6; color: white; border: none; padding: 1rem 2rem;
            border-radius: 4px; cursor: pointer;
        }
        
        @media (max-width: 768px) {
            .modal-content { min-width: 95vw; }
            .dimensions-row { grid-template-columns: 1fr 1fr; }
            .material-line { grid-template-columns: 1fr; }
        }
    </style>
  `;

  const additionalJS = `
    <script>
        let currentEditingProduct = null;
        let packageData = [];
        
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Activate the corresponding button
            const buttons = document.querySelectorAll('.tab-btn');
            buttons.forEach(btn => {
                if (btn.textContent.includes(tabName === 'materials' ? 'Packing Materials' : 'Product Shipping')) {
                    btn.classList.add('active');
                }
            });
        }
        
        // Load data when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadGroups();
            loadPackingMaterials();
            loadCollections();
            loadShippingProducts();
            
            // Form handlers
            document.getElementById('group-form').addEventListener('submit', addGroup);
            document.getElementById('packing-material-form').addEventListener('submit', addPackingMaterial);
        });
        
        // Material Groups functions
        async function loadGroups() {
            try {
                const response = await fetch('/api/shipping/groups');
                const groups = await response.json();
                
                // Update groups list
                const listEl = document.getElementById('groups-list');
                listEl.innerHTML = groups.map(group => 
                    \`<div class="mini-item">
                        <span>\${group.name}</span>
                        <button class="delete-btn" onclick="deleteGroup(\${group.id})">Delete</button>
                    </div>\`
                ).join('');
                
                // Update materials form dropdown
                const selectEl = document.getElementById('material-group');
                selectEl.innerHTML = '<option value="">Select Group</option>' + 
                    groups.map(group => \`<option value="\${group.id}">\${group.name}</option>\`).join('');
                    
            } catch (error) {
                console.error('Error loading groups:', error);
            }
        }
        
        async function addGroup(e) {
            e.preventDefault();
            const name = document.getElementById('group-name').value;
            const description = document.getElementById('group-description').value;
            
            try {
                const response = await fetch('/api/shipping/groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description })
                });
                
                if (response.ok) {
                    document.getElementById('group-form').reset();
                    loadGroups();
                }
            } catch (error) {
                console.error('Error adding group:', error);
            }
        }
        
        async function deleteGroup(id) {
            if (confirm('Delete this group?')) {
                try {
                    await fetch(\`/api/shipping/groups/\${id}\`, { method: 'DELETE' });
                    loadGroups();
                } catch (error) {
                    console.error('Error deleting group:', error);
                }
            }
        }
        
        // Packing Materials functions
        async function loadPackingMaterials() {
            try {
                const response = await fetch('/api/shipping/materials');
                const materials = await response.json();
                
                const listEl = document.getElementById('packing-materials-list');
                listEl.innerHTML = materials.map(mat => 
                    \`<div class="item">
                        <div class="item-info">
                            <h4>\${mat.name}</h4>
                            <p>Group: \${mat.group_name} | \${mat.purchase_unit_qty} \${mat.measure_unit} for $\${mat.purchase_bundle_price} = <strong>$\${mat.cost_per_unit}/\${mat.measure_unit}</strong></p>
                        </div>
                        <div class="item-actions">
                            <button class="edit-btn" onclick="editPackingMaterial(\${mat.id})">Edit</button>
                            <button class="delete-btn" onclick="deletePackingMaterial(\${mat.id})">Delete</button>
                        </div>
                    </div>\`
                ).join('');
                    
            } catch (error) {
                console.error('Error loading packing materials:', error);
            }
        }
        
        async function addPackingMaterial(e) {
            e.preventDefault();
            const formData = {
                group_id: document.getElementById('material-group').value,
                name: document.getElementById('packing-material-name').value,
                measure_unit: document.getElementById('packing-measure-unit').value,
                purchase_unit_qty: document.getElementById('packing-purchase-qty').value,
                purchase_bundle_price: document.getElementById('packing-purchase-price').value
            };
            
            try {
                const response = await fetch('/api/shipping/materials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    document.getElementById('packing-material-form').reset();
                    loadPackingMaterials();
                }
            } catch (error) {
                console.error('Error adding packing material:', error);
            }
        }
        
        function editPackingMaterial(id) {
            // TODO: Implement packing material editing
            alert('Packing material editing - Coming soon!');
        }
        
        async function deletePackingMaterial(id) {
            if (confirm('Delete this packing material?')) {
                try {
                    await fetch(\`/api/shipping/materials/\${id}\`, { method: 'DELETE' });
                    loadPackingMaterials();
                } catch (error) {
                    console.error('Error deleting packing material:', error);
                }
            }
        }
        
        // Product Shipping functions
        async function loadCollections() {
            try {
                const response = await fetch('/api/collections');
                const collections = await response.json();
                
                const selectEl = document.getElementById('collection-filter');
                selectEl.innerHTML = '<option value="">All Collections</option>' + 
                    collections.map(col => \`<option value="\${col.id}">\${col.name}</option>\`).join('');
                    
            } catch (error) {
                console.error('Error loading collections:', error);
            }
        }
        
        async function loadShippingProducts() {
            try {
                const response = await fetch('/api/products');
                const data = await response.json();
                const products = data.products || data;
                
                const listEl = document.getElementById('shipping-products-list');
                listEl.innerHTML = products.map(prod => 
                    \`<div class="item">
                        <div class="item-info">
                            <h4>\${prod.title} \${prod.sku ? '(' + prod.sku + ')' : ''}</h4>
                            <p>Collection: \${prod.collection_name || 'None'} | Batch: \${prod.batch_quantity}</p>
                        </div>
                        <div class="item-actions">
                            <button class="edit-btn" onclick="editProductShipping(\${prod.id})">Edit Shipping</button>
                        </div>
                    </div>\`
                ).join('');
                    
            } catch (error) {
                console.error('Error loading products:', error);
            }
        }
        
        function filterProducts() {
            // TODO: Implement product filtering
            loadShippingProducts();
        }
        
        // Package Editor functions
        async function editProductShipping(productId) {
            currentEditingProduct = productId;
            
            try {
                // Load existing package data
                const response = await fetch(\`/api/shipping/products/\${productId}/packages\`);
                const packages = await response.json();
                
                packageData = packages.length > 0 ? packages : [createEmptyPackage(1)];
                
                document.getElementById('package-count').value = packageData.length;
                document.getElementById('editor-title').textContent = 'Edit Shipping Packages - Product ID: ' + productId;
                
                renderPackages();
                document.getElementById('package-editor').style.display = 'flex';
                
            } catch (error) {
                console.error('Error loading package data:', error);
                // Start with one empty package
                packageData = [createEmptyPackage(1)];
                document.getElementById('package-count').value = 1;
                renderPackages();
                document.getElementById('package-editor').style.display = 'flex';
            }
        }
        
        function createEmptyPackage(number) {
            return {
                package_number: number,
                length: '',
                width: '',
                height: '',
                dimension_unit: 'in',
                weight: '',
                weight_unit: 'lb',
                materials: []
            };
        }
        
        function updatePackageCount() {
            const count = parseInt(document.getElementById('package-count').value);
            
            // Adjust packageData array
            while (packageData.length < count) {
                packageData.push(createEmptyPackage(packageData.length + 1));
            }
            while (packageData.length > count) {
                packageData.pop();
            }
            
            renderPackages();
        }
        
        function renderPackages() {
            const container = document.getElementById('packages-container');
            container.innerHTML = packageData.map((pkg, index) => 
                \`<div class="package-item">
                    <div class="package-header">Package \${index + 1}</div>
                    
                    <div class="dimensions-row">
                        <input type="number" placeholder="Length" value="\${pkg.length}" 
                               onchange="updatePackageField(\${index}, 'length', this.value)" step="0.01">
                        <input type="number" placeholder="Width" value="\${pkg.width}" 
                               onchange="updatePackageField(\${index}, 'width', this.value)" step="0.01">
                        <input type="number" placeholder="Height" value="\${pkg.height}" 
                               onchange="updatePackageField(\${index}, 'height', this.value)" step="0.01">
                        <select onchange="updatePackageField(\${index}, 'dimension_unit', this.value)">
                            <option value="in" \${pkg.dimension_unit === 'in' ? 'selected' : ''}>Inches</option>
                            <option value="ft" \${pkg.dimension_unit === 'ft' ? 'selected' : ''}>Feet</option>
                            <option value="cm" \${pkg.dimension_unit === 'cm' ? 'selected' : ''}>CM</option>
                            <option value="m" \${pkg.dimension_unit === 'm' ? 'selected' : ''}>Meters</option>
                        </select>
                        <input type="number" placeholder="Weight" value="\${pkg.weight}" 
                               onchange="updatePackageField(\${index}, 'weight', this.value)" step="0.01">
                        <select onchange="updatePackageField(\${index}, 'weight_unit', this.value)">
                            <option value="lb" \${pkg.weight_unit === 'lb' ? 'selected' : ''}>Pounds</option>
                            <option value="oz" \${pkg.weight_unit === 'oz' ? 'selected' : ''}>Ounces</option>
                            <option value="kg" \${pkg.weight_unit === 'kg' ? 'selected' : ''}>Kilograms</option>
                            <option value="g" \${pkg.weight_unit === 'g' ? 'selected' : ''}>Grams</option>
                        </select>
                    </div>
                    
                    <div class="materials-section">
                        <h5>Packing Materials</h5>
                        <div id="package-materials-\${index}">
                            \${renderPackageMaterials(index)}
                        </div>
                        <button class="add-material-btn" onclick="addPackageMaterial(\${index})">Add Material</button>
                    </div>
                </div>\`
            ).join('');
        }
        
        function renderPackageMaterials(packageIndex) {
            const materials = packageData[packageIndex].materials || [];
            return materials.map((mat, matIndex) => 
                \`<div class="material-line">
                    <select onchange="updateMaterialGroup(\${packageIndex}, \${matIndex}, this.value)">
                        <option value="">Select Group</option>
                        <!-- Groups will be loaded dynamically -->
                    </select>
                    <select onchange="updateMaterial(\${packageIndex}, \${matIndex}, this.value)">
                        <option value="">Select Material</option>
                        <!-- Materials will be loaded based on group -->
                    </select>
                    <input type="number" placeholder="Qty" value="\${mat.quantity || ''}" 
                           onchange="updateMaterialQuantity(\${packageIndex}, \${matIndex}, this.value)" step="0.001">
                    <span class="cost-display">$\${(mat.line_cost || 0).toFixed(2)}</span>
                    <button class="remove-material-btn" onclick="removePackageMaterial(\${packageIndex}, \${matIndex})">×</button>
                </div>\`
            ).join('');
        }
        
        function updatePackageField(packageIndex, field, value) {
            packageData[packageIndex][field] = value;
        }
        
        function addPackageMaterial(packageIndex) {
            if (!packageData[packageIndex].materials) {
                packageData[packageIndex].materials = [];
            }
            packageData[packageIndex].materials.push({
                group_id: '',
                material_id: '',
                quantity: '',
                cost_per_unit: 0,
                line_cost: 0
            });
            renderPackages();
        }
        
        function removePackageMaterial(packageIndex, materialIndex) {
            packageData[packageIndex].materials.splice(materialIndex, 1);
            renderPackages();
        }
        
        function updateMaterialGroup(packageIndex, materialIndex, groupId) {
            packageData[packageIndex].materials[materialIndex].group_id = groupId;
            // TODO: Load materials for this group
        }
        
        function updateMaterial(packageIndex, materialIndex, materialId) {
            packageData[packageIndex].materials[materialIndex].material_id = materialId;
            // TODO: Update cost calculation
        }
        
        function updateMaterialQuantity(packageIndex, materialIndex, quantity) {
            packageData[packageIndex].materials[materialIndex].quantity = quantity;
            // TODO: Update cost calculation
        }
        
        function closePackageEditor() {
            document.getElementById('package-editor').style.display = 'none';
            currentEditingProduct = null;
            packageData = [];
        }
        
        async function savePackages() {
            if (!currentEditingProduct) return;
            
            try {
                const response = await fetch(\`/api/shipping/products/\${currentEditingProduct}/packages\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ packages: packageData })
                });
                
                if (response.ok) {
                    alert('Packages saved successfully!');
                    closePackageEditor();
                } else {
                    alert('Error saving packages');
                }
            } catch (error) {
                console.error('Error saving packages:', error);
                alert('Error saving packages');
            }
        }
    </script>
  `;

  return createLayout({
    title: 'Shipping - Luca Platform',
    currentPath: '/shipping',
    content,
    additionalCSS,
    additionalJS
  });
}

module.exports = { createShippingPage };
