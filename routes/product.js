const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const router = express.Router();

const dbConfig = { host: '10.128.0.31', user: 'oafuser', password: 'oafpass', database: 'oaf' };
async function getDb() { return await mysql.createConnection(dbConfig); }

router.get('/add_new', async (req, res) => {
    try {
        const db = await getDb();
        const [categories] = await db.query('SELECT id, name FROM categories');
        await db.end();

        const categoryOptions = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        const categoryCheckboxes = categories.map(cat => `<label><input type="checkbox" name="secondary_categories[]" value="${cat.id}"> ${cat.name}</label><br>`).join('');

        const header = fs.readFileSync('/var/www/main/header.html', 'utf8');
        const footer = fs.readFileSync('/var/www/main/footer.html', 'utf8');

        const html = `
            ${header}
            <main>
                <div id="productId" class="product-id">ID: TEMP-XXXX</div>
                <section id="wizardStart" class="wizard-step">
                    <div class="centered">
                        <h1>Add a New Product</h1>
                        <p>What kind of product would you like to create today?</p>
                    </div>
                    <div class="wizard-buttons">
                        <button type="button" class="wizard-btn" onclick="startWizard('simple')">
                            <i class="fas fa-cube fa-3x" style="color: #3e1c56;"></i>
                            <span class="btn-title">Simple</span>
                            <span class="btn-desc">Just one piece or just one style.</span>
                        </button>
                        <button type="button" class="wizard-btn" onclick="startWizard('variations')">
                            <i class="fas fa-cubes fa-3x" style="color: #3e1c56;"></i>
                            <span class="btn-title">Variable</span>
                            <span class="btn-desc">Products with different sizes, colors, etc.</span>
                        </button>
                    </div>
                </section>

                <form id="addProductForm" action="/shop/product/add_new" method="POST" class="hidden">
                    <div id="progressMeter">
                        <div class="step" onclick="goToStep(0)">Start</div>
                        <div class="step" onclick="goToStep(1)">Product Basics</div>
                        <div class="step" onclick="goToStep(2)">Categories</div>
                        <div class="step" onclick="goToStep(3)">Shipping</div>
                        <div class="step" onclick="goToStep(4)">Variations</div>
                        <div class="step" onclick="goToStep(5)">Sales</div>
                        <div class="step" onclick="goToStep(6)">Finish</div>
                    </div>

                    <section id="baseFields" class="wizard-step hidden">
                        <h2>Product Basics</h2>
                        <div class="form-container">
                            <div class="left-column">
                                <div class="form-group">
                                    <label for="name">Product Name:
                                        <span class="info-icon" onmouseover="showBubble('nameBubble')" onmouseout="hideBubble('nameBubble')">ℹ️</span>
                                        <div id="nameBubble" class="info-bubble hidden">The name or title of your artwork.</div>
                                    </label>
                                    <input type="text" id="name" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label for="description">Product Description:
                                        <span class="info-icon" onmouseover="showBubble('descBubble')" onmouseout="hideBubble('descBubble')">ℹ️</span>
                                        <div id="descBubble" class="info-bubble hidden">What's the story with this piece of art?</div>
                                    </label>
                                    <textarea id="description" name="description" required></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="sku">SKU:
                                        <span class="info-icon" onmouseover="showBubble('skuBubble')" onmouseout="hideBubble('skuBubble')">ℹ️</span>
                                        <div id="skuBubble" class="info-bubble hidden">Any code or number that you use to identify your products.<br>If you do not enter anything, a random code will be assigned in our system.</div>
                                    </label>
                                    <input type="text" id="sku" name="sku">
                                </div>
                            </div>
                            <div class="right-column">
                                <div class="form-group">
                                    <label for="category_id">Primary Category:</label>
                                    <select id="category_id" name="category_id" required>
                                        ${categoryOptions}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Additional Categories (up to 3):</label>
                                    <select name="additional_categories[]" multiple size="3">
                                        ${categoryOptions}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="price">Price:</label>
                                    <input type="number" id="price" name="price" step="0.01" required oninput="calculatePayout()">
                                    <div id="priceCalculator">
                                        <p>Commission (20%): <span id="commission">$0.00</span></p>
                                        <p>Expected Payout: <span id="payout">$0.00</span></p>
                                    </div>
                                </div>
                            </div>
                            <div class="extra-fields">
                                <label for="available_qty">Available Quantity:</label>
                                <input type="number" id="available_qty" name="available_qty" min="0">
                                <label for="width">Width:</label>
                                <input type="number" id="width" name="width" step="0.01">
                                <label for="height">Height:</label>
                                <input type="number" id="height" name="height" step="0.01">
                                <label for="depth">Depth:</label>
                                <input type="number" id="depth" name="depth" step="0.01">
                                <label for="weight">Weight:</label>
                                <input type="number" id="weight" name="weight" step="0.01">
                                <label for="dimension_unit">Dimension Unit:</label>
                                <select id="dimension_unit" name="dimension_unit">
                                    <option value="">Select</option>
                                    <option value="in">Inches</option>
                                    <option value="cm">Centimeters</option>
                                </select>
                                <label for="weight_unit">Weight Unit:</label>
                                <select id="weight_unit" name="weight_unit">
                                    <option value="">Select</option>
                                    <option value="lbs">Pounds</option>
                                    <option value="kg">Kilograms</option>
                                </select>
                            </div>
                            <input type="hidden" name="vendor_id" value="${req.session.user?.id || 1000000005}">
                            <input type="hidden" name="created_by" value="${req.session.user?.id || 1000000005}">
                            <input type="hidden" name="product_type" id="productType">
                        </div>
                    </section>

                    <section id="categoriesSection" class="wizard-step hidden">
                        <h2>Secondary Categories</h2>
                        <div class="grid">${categoryCheckboxes}</div>
                    </section>

                    <section id="shippingSection" class="wizard-step hidden">
                        <h2>Shipping Details</h2>
                        <div class="grid">
                            <div>
                                <h3>Package 1</h3>
                                <label>Length: <input type="number" name="shipping[1][length]" step="0.01"></label>
                                <label>Width: <input type="number" name="shipping[1][width]" step="0.01"></label>
                                <label>Height: <input type="number" name="shipping[1][height]" step="0.01"></label>
                                <label>Weight: <input type="number" name="shipping[1][weight]" step="0.01"></label>
                                <label>Dimension Unit:
                                    <select name="shipping[1][dimension_unit]">
                                        <option value="">Select</option>
                                        <option value="in">Inches</option>
                                        <option value="cm">Centimeters</option>
                                    </select>
                                </label>
                                <label>Weight Unit:
                                    <select name="shipping[1][weight_unit]">
                                        <option value="">Select</option>
                                        <option value="lbs">Pounds</option>
                                        <option value="kg">Kilograms</option>
                                    </select>
                                </label>
                            </div>
                        </div>
                    </section>

                    <section id="variationsSection" class="wizard-step hidden">
                        <h2>Variations</h2>
                        <div id="variantKinds">
                            <button type="button" class="add-btn" onclick="addVariantKind()">Add Variant Kind</button>
                        </div>
                    </section>

                    <section id="salesSection" class="wizard-step hidden">
                        <h2>Sale Details</h2>
                        <div class="grid">
                            <label>Sale Price: <input type="number" name="sale_price" step="0.01"></label>
                            <label>Start Date: <input type="datetime-local" name="start_date"></label>
                            <label>End Date: <input type="datetime-local" name="end_date"></label>
                        </div>
                    </section>

                    <section id="finishSection" class="wizard-step hidden">
                        <h2>Review and Finish</h2>
                        <p>Please review your product details before submitting.</p>
                    </section>

                    <div class="nav-buttons">
                        <button type="button" id="backBtn" class="nav-btn hidden" onclick="goBack()">Back</button>
                        <button type="button" id="nextBtn" class="nav-btn hidden" onclick="goNext()">Next</button>
                        <button type="submit" id="createBtn" name="action" value="submit" class="nav-btn hidden">Create Product</button>
                        <button type="submit" id="draftBtn" name="action" value="draft" class="nav-btn">Save as Draft</button>
                        <button type="button" id="cancelBtn" class="nav-btn" onclick="confirmCancel()">Cancel</button>
                    </div>
                </form>

                <div id="successPopup" class="hidden">
                    <p id="successMessage">New item successfully created</p>
                    <button onclick="document.getElementById('successPopup').style.display = 'none'; window.location.href = '/shop/product/add_new';">OK</button>
                </div>

                <div id="cancelWarning" class="hidden">
                    <p>Your changes are not saved. Save as a draft or discard?</p>
                    <button onclick="document.getElementById('addProductForm').action.value = 'draft'; document.getElementById('addProductForm').submit();">Save as Draft</button>
                    <button onclick="window.location.href = '/shop/product/add_new';">Delete</button>
                </div>
            </main>
            ${footer}
            <style>
                main { padding: 20px; max-width: 900px; margin: 0 auto 40px; border: 5px solid #3e1c56; position: relative; }
                .product-id { position: absolute; top: 10px; left: 10px; color: #666; font-family: 'Courier New', monospace; font-size: 14px; }
                .centered { display: flex; flex-direction: column; align-items: center; text-align: center; }
                .wizard-step { padding: 15px; margin-bottom: 20px; margin-top: 40px; }
                .form-container { display: flex; flex-wrap: wrap; gap: 20px; }
                .left-column, .right-column, .extra-fields { flex: 1; min-width: 250px; }
                .form-group { margin-bottom: 15px; position: relative; }
                .form-group label { display: block; margin-bottom: 5px; }
                .form-group input, .form-group textarea, .form-group select {
                    width: 100%; padding: 5px; font-family: inherit; box-sizing: border-box;
                }
                .form-group textarea { height: 100px; resize: vertical; }
                .info-icon { cursor: pointer; color: #055474; margin-left: 5px; }
                .info-bubble {
                    position: absolute; background: #f9f9f9; border: 1px solid #ccc; padding: 10px;
                    z-index: 1000; width: 200px; left: 100%; top: 0; display: none;
                }
                .info-bubble.hidden { display: none; }
                #priceCalculator { margin-top: 5px; font-size: 12px; }
                .wizard-buttons { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
                .wizard-btn { 
                    width: 250px; height: 250px; background: white; border: 2px solid #055474; 
                    display: flex; flex-direction: column; align-items: center; justify-content: center; 
                    cursor: pointer; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); transition: transform 0.2s ease; 
                }
                .wizard-btn:hover { transform: scale(1.05); }
                .btn-title { margin: 10px 0 5px; }
                .btn-desc { font-size: 12px; font-style: italic; color: #a9a9a9; text-align: center; padding: 0 10px; }
                .add-btn { background: #055474; color: white; padding: 5px 10px; margin: 10px 0; }
                .add-btn:hover { background: #033d56; }
                .hidden { display: none; }
                #progressMeter { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .step { flex: 1; text-align: center; padding: 10px; background: #e0e0e0; cursor: pointer; }
                .step.active { background: #055474; color: white; }
                .nav-buttons { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
                .nav-btn { background: #055474; color: white; padding: 10px 20px; border: none; cursor: pointer; }
                .nav-btn:hover { background: #033d56; }
                #successPopup, #cancelWarning { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 5px solid #3e1c56; z-index: 1000; }
            </style>
            <script>
                let currentStep = 0;
                const steps = ['wizardStart', 'baseFields', 'categoriesSection', 'shippingSection', 'variationsSection', 'salesSection', 'finishSection'];
                let formData = {};

                function startWizard(type) {
                    try {
                        currentStep = 1;
                        formData.product_type = type;
                        formData.id = 'TEMP-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                        const idField = document.getElementById('id');
                        const productTypeField = document.getElementById('productType');
                        const wizardStart = document.getElementById('wizardStart');
                        const addProductForm = document.getElementById('addProductForm');
                        const baseFields = document.getElementById('baseFields');
                        const productIdDisplay = document.getElementById('productId');

                        if (!idField || !productTypeField || !wizardStart || !addProductForm || !baseFields || !productIdDisplay) {
                            console.error('Missing DOM elements:', { idField, productTypeField, wizardStart, addProductForm, baseFields, productIdDisplay });
                            return;
                        }

                        idField.value = formData.id;
                        productTypeField.value = type;
                        productIdDisplay.textContent = 'ID: ' + formData.id;
                        wizardStart.classList.add('hidden');
                        addProductForm.classList.remove('hidden');
                        baseFields.classList.remove('hidden');
                        updateProgress();
                        updateButtons();
                    } catch (err) {
                        console.error('Error in startWizard:', err);
                    }
                }

                function goToStep(step) {
                    try {
                        if (step >= 0 && step < steps.length) {
                            saveFormData();
                            steps.forEach((id, index) => {
                                const el = document.getElementById(id);
                                if (!el) {
                                    console.error('Element not found:', id);
                                    return;
                                }
                                if (index === step) el.classList.remove('hidden');
                                else el.classList.add('hidden');
                            });
                            currentStep = step;
                            loadFormData();
                            updateProgress();
                            updateButtons();
                        }
                    } catch (err) {
                        console.error('Error in goToStep:', err);
                    }
                }

                function saveFormData() {
                    try {
                        const form = document.getElementById('addProductForm');
                        if (!form) {
                            console.error('Form not found');
                            return;
                        }
                        const inputs = form.querySelectorAll('input, textarea, select');
                        inputs.forEach(input => {
                            if (input.type === 'checkbox' || input.tagName === 'SELECT' && input.multiple) {
                                if (!formData[input.name]) formData[input.name] = [];
                                if (input.selectedOptions) {
                                    formData[input.name] = Array.from(input.selectedOptions).map(opt => opt.value);
                                } else if (input.checked) {
                                    formData[input.name].push(input.value);
                                }
                            } else {
                                formData[input.name] = input.value;
                            }
                        });
                    } catch (err) {
                        console.error('Error in saveFormData:', err);
                    }
                }

                function loadFormData() {
                    try {
                        const inputs = document.querySelectorAll('#addProductForm input, #addProductForm textarea, #addProductForm select');
                        inputs.forEach(input => {
                            if (input.type === 'checkbox') {
                                if (formData[input.name] && formData[input.name].includes(input.value)) {
                                    input.checked = true;
                                }
                            } else if (input.tagName === 'SELECT' && input.multiple) {
                                if (formData[input.name]) {
                                    Array.from(input.options).forEach(option => {
                                        option.selected = formData[input.name].includes(option.value);
                                    });
                                }
                            } else if (formData[input.name]) {
                                input.value = formData[input.name];
                            }
                        });
                        calculatePayout();
                    } catch (err) {
                        console.error('Error in loadFormData:', err);
                    }
                }

                function calculatePayout() {
                    const priceField = document.getElementById('price');
                    const commissionSpan = document.getElementById('commission');
                    const payoutSpan = document.getElementById('payout');
                    if (!priceField || !commissionSpan || !payoutSpan) return;

                    const price = parseFloat(priceField.value) || 0;
                    const commission = price * 0.2; // 20% commission
                    const payout = price - commission;
                    commissionSpan.textContent = '$' + commission.toFixed(2);
                    payoutSpan.textContent = '$' + payout.toFixed(2);
                }

                function showBubble(id) {
                    const bubble = document.getElementById(id);
                    if (bubble) bubble.classList.remove('hidden');
                }

                function hideBubble(id) {
                    const bubble = document.getElementById(id);
                    if (bubble) bubble.classList.add('hidden');
                }

                function goBack() {
                    if (currentStep > 1) goToStep(currentStep - 1);
                }

                function goNext() {
                    if (currentStep < steps.length - 1) goToStep(currentStep + 1);
                }

                function updateProgress() {
                    try {
                        const stepsEls = document.querySelectorAll('.step');
                        stepsEls.forEach((el, index) => {
                            el.classList.toggle('active', index === currentStep);
                        });
                    } catch (err) {
                        console.error('Error in updateProgress:', err);
                    }
                }

                function updateButtons() {
                    try {
                        const backBtn = document.getElementById('backBtn');
                        const nextBtn = document.getElementById('nextBtn');
                        const createBtn = document.getElementById('createBtn');
                        if (!backBtn || !nextBtn || !createBtn) {
                            console.error('Button elements not found');
                            return;
                        }
                        backBtn.classList.toggle('hidden', currentStep <= 1);
                        nextBtn.classList.toggle('hidden', currentStep >= steps.length - 1);
                        createBtn.classList.toggle('hidden', currentStep < steps.length - 1);
                    } catch (err) {
                        console.error('Error in updateButtons:', err);
                    }
                }

                let kindCount = 0;
                function addVariantKind() {
                    if (kindCount >= 5) return alert('Max 5 variant kinds');
                    kindCount++;
                    const div = document.createElement('div');
                    div.className = 'variant-kind';
                    div.innerHTML = \`
                        <h3>Variant Kind \${kindCount}</h3>
                        <label>Type:
                            <select name="variant_kinds[\${kindCount}][type]">
                                <option value="size">Size</option>
                                <option value="color">Color</option>
                                <option value="pattern">Pattern</option>
                            </select>
                        </label>
                        <div id="options\${kindCount}">
                            <button type="button" class="add-btn" onclick="addOption(\${kindCount})">Add Option</button>
                        </div>
                    \`;
                    const variantKinds = document.getElementById('variantKinds');
                    if (variantKinds) variantKinds.appendChild(div);
                }

                function addOption(kindId) {
                    const optionsDiv = document.getElementById(\`options\${kindId}\`);
                    if (!optionsDiv) return;
                    const optionCount = optionsDiv.getElementsByTagName('input').length;
                    if (optionCount >= 15) return alert('Max 15 options per kind');
                    const input = document.createElement('div');
                    input.innerHTML = \`
                        <label>Option \${optionCount + 1}: 
                            <input type="text" name="variant_kinds[\${kindId}][options][]">
                        </label>
                    \`;
                    optionsDiv.appendChild(input);
                }

                function confirmCancel() {
                    const cancelWarning = document.getElementById('cancelWarning');
                    if (cancelWarning) cancelWarning.classList.remove('hidden');
                }
            </script>
        `;
        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/add_new', async (req, res) => {
    const db = await getDb();
    try {
        await db.beginTransaction();

        const isVariation = req.body.product_type === 'variations';
        const status = req.body.action === 'draft' ? 'draft' : 'active';

        const productData = {
            name: req.body.name,
            price: req.body.price,
            available_qty: req.body.available_qty || 0,
            vendor_id: req.body.vendor_id || 1000000005,
            category_id: req.body.category_id,
            description: req.body.description,
            sku: req.body.sku || 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            status: status,
            created_by: req.body.created_by || 1000000005,
            width: req.body.width || null,
            height: req.body.height || null,
            depth: req.body.depth || null,
            weight: req.body.weight || null,
            dimension_unit: req.body.dimension_unit || null,
            weight_unit: req.body.weight_unit || null
        };
        const [productResult] = await db.query('INSERT INTO products SET ?', productData);
        const parentId = productResult.insertId;

        const secondaryCategories = req.body.additional_categories || [];
        const allCategories = [req.body.category_id, ...secondaryCategories].slice(0, 4); // Limit to 4 total
        for (const catId of allCategories) {
            await db.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [parentId, catId]);
        }

        if (req.body.shipping) {
            for (const [packageNum, shipping] of Object.entries(req.body.shipping)) {
                if (shipping.length || shipping.width || shipping.height || shipping.weight) {
                    await db.query(
                        'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [parentId, packageNum, shipping.length || null, shipping.width || null, shipping.height || null, shipping.weight || null, shipping.dimension_unit || null, shipping.weight_unit || null]
                    );
                }
            }
        }

        let createdProducts = [{ id: parentId, name: productData.name, sku: productData.sku }];
        if (isVariation && req.body.variant_kinds) {
            const variants = [];
            for (const [kindId, kind] of Object.entries(req.body.variant_kinds)) {
                if (kind.type && kind.options) {
                    variants.push({ type: kind.type, options: kind.options.filter(opt => opt) });
                }
            }

            const combinations = generateCombinations(variants);
            for (const combo of combinations) {
                const childData = {
                    ...productData,
                    name: `${productData.name} (${combo.map(c => c.option).join(', ')})`,
                    sku: `${productData.sku}-${combo.map(c => c.option).join('-')}`,
                    parent_id: parentId,
                    status: status
                };
                const [childResult] = await db.query('INSERT INTO products SET ?', childData);
                const childId = childResult.insertId;
                createdProducts.push({ id: childId, name: childData.name, sku: childData.sku });

                for (const catId of allCategories) {
                    await db.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [childId, catId]);
                }
                if (req.body.shipping) {
                    for (const [packageNum, shipping] of Object.entries(req.body.shipping)) {
                        if (shipping.length || shipping.width || shipping.height || shipping.weight) {
                            await db.query(
                                'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [childId, packageNum, shipping.length || null, shipping.width || null, shipping.height || null, shipping.weight || null, shipping.dimension_unit || null, shipping.weight_unit || null]
                            );
                        }
                    }
                }
            }
        }

        if (req.body.sale_price && req.body.start_date && req.body.end_date) {
            await db.query(
                'INSERT INTO sales (product_id, sale_price, start_date, end_date) VALUES (?, ?, ?, ?)',
                [parentId, req.body.sale_price, req.body.start_date, req.body.end_date]
            );
        }

        await db.commit();

        const productCards = createdProducts.map(p => `
            <div class="product">
                <h3>${p.name}</h3>
                <p>ID: ${p.id} | SKU: ${p.sku}</p>
            </div>
        `).join('');

        res.send(`
            <script>
                document.body.innerHTML += \`
                    <div id="successPopup" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 5px solid #3e1c56; z-index: 1000;">
                        <p>New item successfully created</p>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                            ${productCards}
                        </div>
                        <button onclick="window.location.href = '/shop/product/add_new';">OK</button>
                    </div>
                \`;
            </script>
        `);
    } catch (err) {
        await db.rollback();
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

function generateCombinations(variants) {
    return variants.reduce((acc, variant) => {
        const result = [];
        acc.forEach(a => {
            variant.options.forEach(opt => {
                result.push([...a, { type: variant.type, option: opt }]);
            });
        });
        return result;
    }, [[]]);
}

module.exports = router;
