const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const router = express.Router();

const dbConfig = { host: '10.128.0.31', user: 'oafuser', password: 'oafpass', database: 'oaf' };
async function getDb() { return await mysql.createConnection(dbConfig); }

// GET /add_new
router.get('/add_new', async (req, res) => {
    try {
        const db = await getDb();
        const [categories] = await db.query('SELECT id, name, parent_id FROM categories');
        const [customKinds] = await db.query('SELECT id, name FROM variant_kinds WHERE user_id = ?', [req.session.user?.id || 1000000005]);
        await db.end();

        const categoryOptions = categories
            .filter(cat => !cat.parent_id)
            .map(cat => {
                const subcategories = categories
                    .filter(sub => sub.parent_id === cat.id)
                    .map(sub => `<option value="${sub.id}">  - ${sub.name}</option>`)
                    .join('');
                return `<option value="${cat.id}">${cat.name}</option>${subcategories}`;
            })
            .join('');
        const customKindOptions = customKinds.map(kind => `<option value="${kind.name}">${kind.name} (Edit | Delete)</option>`).join('');

        const header = fs.readFileSync('/var/www/main/header.html', 'utf8');
        const footer = fs.readFileSync('/var/www/main/footer.html', 'utf8');

        const html = `
            ${header}
            <link rel="stylesheet" href="/css/product.css">
            <main>
                <div id="productId" class="product-id">ID: ${req.session.draftId || 'New'}</div>
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
                    <div id="progressMeter" class="hidden">
                        <div class="step" onclick="goToStep(0)">Start</div>
                        <div class="step" onclick="goToStep(1)">Product Basics</div>
                        <div class="step" onclick="goToStep(2)">Categories</div>
                        <div class="step" onclick="goToStep(3)">Shipping</div>
                        <div class="step" onclick="goToStep(4)">Variations</div>
                        <div class="step" onclick="goToStep(5)">Images</div>
                        <div class="step" onclick="goToStep(6)">Finish</div>
                    </div>

                    <section id="baseFields" class="wizard-step hidden">
                        <h2>Product Basics</h2>
                        <p style="font-size: 12px; color: #666;">All fields except SKU are required.</p>
                        <div id="variantNote" class="hidden" style="font-size: 12px; font-style: italic; color: #999;">
                            <i>This will be your default data for your variations and will represent the parent product in searches.</i>
                        </div>
                        <div class="form-container">
                            <input type="hidden" id="id" name="id" value="${req.session.draftId || ''}">
                            <hr class="top-hr">
                            <div class="form-group full-width">
                                <label for="name">Product Name:
                                    <i class="fas fa-info-circle info-icon" onmouseover="showBubble('nameBubble')" onmouseout="hideBubble('nameBubble')"></i>
                                    <div id="nameBubble" class="info-bubble">The name or title of your artwork.</div>
                                </label>
                                <input type="text" id="name" name="name" value="Artwork" required>
                            </div>
                            <div class="form-group full-width">
                                <label for="description">Product Description:
                                    <i class="fas fa-info-circle info-icon" onmouseover="showBubble('descBubble')" onmouseout="hideBubble('descBubble')"></i>
                                    <div id="descBubble" class="info-bubble">What's the story with this piece of art?</div>
                                </label>
                                <textarea id="description" name="description" required></textarea>
                            </div>
                            <hr>
                            <div class="columns">
                                <div class="left-column">
                                    <div class="form-group">
                                        <label for="sku">SKU:
                                            <i class="fas fa-info-circle info-icon" onmouseover="showBubble('skuBubble')" onmouseout="hideBubble('skuBubble')"></i>
                                            <div id="skuBubble" class="info-bubble">Any code or number that you use to identify your products.<br>If you do not enter anything, a random code will be assigned in our system.</div>
                                        </label>
                                        <input type="text" id="sku" name="sku">
                                    </div>
                                    <div class="form-group">
                                        <label for="available_qty">Available Quantity:</label>
                                        <div class="number-input">
                                            <input type="number" id="available_qty" name="available_qty" min="0" value="0" class="narrow" required>
                                            <div class="arrows">
                                                <button type="button" onclick="adjustQty('available_qty', 1)">▲</button>
                                                <button type="button" onclick="adjustQty('available_qty', -1)">▼</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="right-column">
                                    <div class="form-group">
                                        <label for="price">Retail Price:</label>
                                        <div class="number-input">
                                            <input type="number" id="price" name="price" step="0.01" required oninput="calculatePayout()" class="price-narrow">
                                            <div class="arrows">
                                                <button type="button" onclick="adjustValue('price', 0.01)">▲</button>
                                                <button type="button" onclick="adjustValue('price', -0.01)">▼</button>
                                            </div>
                                        </div>
                                        <div id="priceCalculator">
                                            <p>Commission (20%): <span id="commission">$0.00</span></p>
                                            <p>Expected Payout: <span id="payout">$0.00</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <hr>
                            <div class="columns">
                                <div class="left-column">
                                    <div class="form-group dimension-group">
                                        <label>Dimensions:</label>
                                        <div class="dimension-row">
                                            <div class="number-input">
                                                <input type="number" id="width" name="width" step="0.01" class="narrow" placeholder="W" required>
                                                <div class="arrows">
                                                    <button type="button" onclick="adjustValue('width', 0.01)">▲</button>
                                                    <button type="button" onclick="adjustValue('width', -0.01)">▼</button>
                                                </div>
                                            </div>
                                            <div class="number-input">
                                                <input type="number" id="height" name="height" step="0.01" class="narrow" placeholder="H" required>
                                                <div class="arrows">
                                                    <button type="button" onclick="adjustValue('height', 0.01)">▲</button>
                                                    <button type="button" onclick="adjustValue('height', -0.01)">▼</button>
                                                </div>
                                            </div>
                                            <div class="number-input">
                                                <input type="number" id="depth" name="depth" step="0.01" class="narrow" placeholder="D" required>
                                                <div class="arrows">
                                                    <button type="button" onclick="adjustValue('depth', 0.01)">▲</button>
                                                    <button type="button" onclick="adjustValue('depth', -0.01)">▼</button>
                                                </div>
                                            </div>
                                            <select id="dimension_unit" name="dimension_unit" required>
                                                <option value="">Unit</option>
                                                <option value="in">Inches</option>
                                                <option value="cm">Centimeters</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="right-column">
                                    <div class="form-group inline-group">
                                        <label for="weight">Weight:</label>
                                        <div class="number-input">
                                            <input type="number" id="weight" name="weight" step="0.01" class="narrow" required>
                                            <div class="arrows">
                                                <button type="button" onclick="adjustValue('weight', 0.01)">▲</button>
                                                <button type="button" onclick="adjustValue('weight', -0.01)">▼</button>
                                            </div>
                                        </div>
                                        <select id="weight_unit" name="weight_unit" required>
                                            <option value="">Unit</option>
                                            <option value="lbs">Pounds</option>
                                            <option value="kg">Kilograms</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <input type="hidden" name="vendor_id" value="${req.session.user?.id || 1000000005}">
                            <input type="hidden" name="created_by" value="${req.session.user?.id || 1000000005}">
                            <input type="hidden" name="product_type" id="productType">
                        </div>
                    </section>

                    <section id="categoriesSection" class="wizard-step hidden">
                        <h2>Categories</h2>
                        <div class="form-container">
                            <div class="form-group">
                                <label for="category_id">Primary Category (Required):</label>
                                <select id="category_id" name="category_id" required>
                                    <option value="">Select a category</option>
                                    ${categoryOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="additional_category_1">Additional Category 1:</label>
                                <select id="additional_category_1" name="additional_categories[]">
                                    <option value="">None</option>
                                    ${categoryOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="additional_category_2">Additional Category 2:</label>
                                <select id="additional_category_2" name="additional_categories[]">
                                    <option value="">None</option>
                                    ${categoryOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="additional_category_3">Additional Category 3:</label>
                                <select id="additional_category_3" name="additional_categories[]">
                                    <option value="">None</option>
                                    ${categoryOptions}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section id="shippingSection" class="wizard-step hidden">
                        <h2>Shipping Details</h2>
                        <div class="shipping-buttons">
                            <button type="button" class="shipping-btn" onclick="selectShippingMethod('free')" data-method="free">
                                <i class="fas fa-gift fa-3x" style="color: #3e1c56;"></i>
                                <span class="btn-title">Free</span>
                                <span class="btn-desc">Customer pays no shipping</span>
                            </button>
                            <button type="button" class="shipping-btn" onclick="selectShippingMethod('flat_rate')" data-method="flat_rate">
                                <i class="fas fa-dollar-sign fa-3x" style="color: #3e1c56;"></i>
                                <span class="btn-title">Flat Rate</span>
                                <span class="btn-desc">Customer pays a flat price for each purchased product</span>
                            </button>
                            <button type="button" class="shipping-btn active" onclick="selectShippingMethod('calculated')" data-method="calculated">
                                <i class="fas fa-truck fa-3x" style="color: #3e1c56;"></i>
                                <span class="btn-title">Calculated</span>
                                <span class="btn-desc">Customer pays based on live-estimates of shipping rates</span>
                            </button>
                        </div>
                        <input type="hidden" id="ship_method" name="ship_method" value="calculated">
                        <div id="shippingFields" class="form-container">
                            <div id="flatRateFields" class="hidden">
                                <label for="ship_rate">Shipping Rate ($):</label>
                                <input type="number" id="ship_rate" name="ship_rate" step="0.01" placeholder="0.00">
                            </div>
                            <div id="calculatedFields">
                                <div id="packages">
                                    <div class="package" data-package="1">
                                        <h3>Pkg 1</h3>
                                        <div class="columns">
                                            <div class="left-column">
                                                <div class="form-group dimension-group">
                                                    <label>Dimensions:</label>
                                                    <div class="dimension-row">
                                                        <div class="number-input">
                                                            <input type="number" name="shipping[1][length]" step="0.01" class="narrow" placeholder="L" oninput="debouncedUpdateShippingOptions()">
                                                            <div class="arrows">
                                                                <button type="button" onclick="adjustValue('shipping[1][length]', 0.01)">▲</button>
                                                                <button type="button" onclick="adjustValue('shipping[1][length]', -0.01)">▼</button>
                                                            </div>
                                                        </div>
                                                        <div class="number-input">
                                                            <input type="number" name="shipping[1][width]" step="0.01" class="narrow" placeholder="W" oninput="debouncedUpdateShippingOptions()">
                                                            <div class="arrows">
                                                                <button type="button" onclick="adjustValue('shipping[1][width]', 0.01)">▲</button>
                                                                <button type="button" onclick="adjustValue('shipping[1][width]', -0.01)">▼</button>
                                                            </div>
                                                        </div>
                                                        <div class="number-input">
                                                            <input type="number" name="shipping[1][height]" step="0.01" class="narrow" placeholder="H" oninput="debouncedUpdateShippingOptions()">
                                                            <div class="arrows">
                                                                <button type="button" onclick="adjustValue('shipping[1][height]', 0.01)">▲</button>
                                                                <button type="button" onclick="adjustValue('shipping[1][height]', -0.01)">▼</button>
                                                            </div>
                                                        </div>
                                                        <select name="shipping[1][dimension_unit]" onchange="debouncedUpdateShippingOptions()">
                                                            <option value="">Unit</option>
                                                            <option value="in">Inches</option>
                                                            <option value="cm">Centimeters</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="right-column">
                                                <div class="form-group inline-group">
                                                    <label for="shipping[1][weight]">Weight:</label>
                                                    <div class="number-input">
                                                        <input type="number" name="shipping[1][weight]" step="0.01" class="narrow" oninput="debouncedUpdateShippingOptions()">
                                                        <div class="arrows">
                                                            <button type="button" onclick="adjustValue('shipping[1][weight]', 0.01)">▲</button>
                                                            <button type="button" onclick="adjustValue('shipping[1][weight]', -0.01)">▼</button>
                                                        </div>
                                                    </div>
                                                    <select name="shipping[1][weight_unit]" onchange="debouncedUpdateShippingOptions()">
                                                        <option value="">Unit</option>
                                                        <option value="lbs">Pounds</option>
                                                        <option value="kg">Kilograms</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="add-btn" onclick="addPackage()">Add Another Package</button>
                                <div id="shippingServices" class="form-group">
                                    <label>Available Shipping Services:</label>
                                    <div id="servicesList" class="services-grid"></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="variationsSection" class="wizard-step hidden">
                        <h2>Variations</h2>
                        <div id="variantKinds">
                            <button type="button" class="add-btn" onclick="addVariantKind()">Add Variant Kind</button>
                        </div>
                        <div id="variationsList" class="variations-list"></div>
                        <div class="variant-actions">
                            <button type="button" class="add-btn" onclick="bulkAddVariants()">Create Selected</button>
                            <button type="button" class="add-btn" onclick="addAllVariants()">Add All</button>
                            <button type="button" class="add-btn" onclick="bulkEditVariants()">Bulk Edit</button>
                        </div>
                        <div id="bulkEditForm" class="hidden"></div>
                    </section>

                    <section id="imagesSection" class="wizard-step hidden">
                        <h2>Images</h2>
                        <p>Image upload functionality coming soon!</p>
                    </section>

                    <section id="finishSection" class="wizard-step hidden">
                        <h2>Review and Finish</h2>
                        <p>Please review your product details before submitting.</p>
                    </section>

                    <div class="nav-buttons hidden">
                        <button type="button" id="backBtn" class="nav-btn hidden" onclick="goBack()">Back</button>
                        <button type="button" id="cancelBtn" class="nav-btn" onclick="confirmCancel()">Cancel</button>
                        <button type="submit" id="draftBtn" name="action" value="draft" class="nav-btn">Save as Draft</button>
                        <button type="button" id="nextBtn" class="nav-btn hidden" onclick="goNext()">Next</button>
                        <button type="submit" id="createBtn" name="action" value="submit" class="nav-btn hidden">Create Product</button>
                    </div>
                </form>

                <div id="successPopup" class="hidden">
                    <p id="successMessage">New item successfully created</p>
                    <button onclick="document.getElementById('successPopup').style.display = 'none'; window.location.href = '/shop/product/add_new';">OK</button>
                </div>

                <div id="cancelWarning" class="hidden">
                    <p>Are you sure? This will delete all changes and you cannot recover them. If you have variants attached, they will also be deleted.</p>
                    <button onclick="cancelDraft()">Delete</button>
                    <button onclick="document.getElementById('cancelWarning').classList.add('hidden')">Cancel</button>
                </div>
            </main>
            ${footer}
            <script>
                let currentStep = 0;
                let steps = ['wizardStart', 'baseFields', 'categoriesSection', 'shippingSection', 'variationsSection', 'imagesSection', 'finishSection'];
                let formData = { variant_kinds: [] };
                let packageCount = 1;
                let kindCount = 0;

                async function startWizard(type) {
                    console.log(\`Starting wizard with type: \${type}\`);
                    try {
                        const response = await fetch('/shop/product/draft', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ product_type: type, user_id: ${req.session.user?.id || 1000000005} })
                        });
                        if (!response.ok) throw new Error(\`Fetch failed with status: \${response.status}\`);
                        const data = await response.json();

                        document.getElementById('productId').textContent = 'ID: ' + data.id;
                        document.getElementById('id').value = data.id;

                        currentStep = 1;
                        formData.product_type = type;

                        if (type === 'simple') {
                            steps = ['wizardStart', 'baseFields', 'categoriesSection', 'shippingSection', 'imagesSection', 'finishSection'];
                            document.getElementById('variationsSection').classList.add('hidden');
                        } else {
                            steps = ['wizardStart', 'baseFields', 'categoriesSection', 'shippingSection', 'variationsSection', 'imagesSection', 'finishSection'];
                            document.getElementById('variationsSection').classList.add('hidden');
                        }

                        document.getElementById('wizardStart').classList.add('hidden');
                        document.getElementById('addProductForm').classList.remove('hidden');
                        document.getElementById('baseFields').classList.remove('hidden');
                        document.getElementById('progressMeter').classList.remove('hidden');
                        document.querySelector('.nav-buttons').classList.remove('hidden');

                        updateProgress();
                        updateButtons();
                    } catch (error) {
                        console.error('Error in startWizard:', error);
                    }
                }

                function goToStep(step) {
                    console.log('Attempting to go to step:', step, 'Current step:', currentStep);
                    if (step >= 0 && step < steps.length) {
                        if (step > currentStep + 1) {
                            console.log('Blocked: Can only move forward one step at a time via Next');
                            return;
                        }
                        saveFormData();
                        steps.forEach((id, index) => {
                            const el = document.getElementById(id);
                            if (index === step) el.classList.remove('hidden');
                            else el.classList.add('hidden');
                        });
                        currentStep = step;

                        if (step === 0) {
                            document.getElementById('progressMeter').classList.add('hidden');
                            document.querySelector('.nav-buttons').classList.add('hidden');
                        } else {
                            document.getElementById('progressMeter').classList.remove('hidden');
                            document.querySelector('.nav-buttons').classList.remove('hidden');
                        }

                        loadFormData();
                        updateProgress();
                        updateButtons();
                        if (step === steps.indexOf('shippingSection')) debouncedUpdateShippingOptions();
                        if (step === steps.indexOf('variationsSection')) updateVariationsList();
                    }
                }

                function saveFormData() {
                    const form = document.getElementById('addProductForm');
                    const inputs = form.querySelectorAll('input:not([type="submit"]), textarea, select');
                    inputs.forEach(input => {
                        if (input.type === 'checkbox' && input.name === 'shipping_services[]') {
                            if (!formData['shipping_services']) formData['shipping_services'] = [];
                            if (input.checked) formData['shipping_services'].push(input.value);
                        } else {
                            formData[input.name] = input.value;
                        }
                    });
                    formData.variant_kinds = Array.from(document.querySelectorAll('.variant-kind')).map(kind => ({
                        type: kind.querySelector('select').value,
                        options: Array.from(kind.querySelectorAll('.tag')).map(tag => tag.dataset.value)
                    }));
                }

                function loadFormData() {
                    const inputs = document.querySelectorAll('#addProductForm input:not([type="submit"]), #addProductForm textarea, #addProductForm select');
                    inputs.forEach(input => {
                        if (input.type === 'checkbox' && input.name === 'shipping_services[]') {
                            if (formData['shipping_services'] && formData['shipping_services'].includes(input.value)) {
                                input.checked = true;
                            }
                        } else if (formData[input.name]) {
                            input.value = formData[input.name];
                        }
                    });
                    calculatePayout();
                }

                function calculatePayout() {
                    const priceField = document.getElementById('price');
                    const commissionSpan = document.getElementById('commission');
                    const payoutSpan = document.getElementById('payout');
                    if (!priceField || !commissionSpan || !payoutSpan) return;

                    const price = parseFloat(priceField.value) || 0;
                    const commission = price * 0.2;
                    const payout = price - commission;
                    commissionSpan.textContent = '$' + commission.toFixed(2);
                    payoutSpan.textContent = '$' + payout.toFixed(2);
                }

                function showBubble(id) {
                    const bubble = document.getElementById(id);
                    if (bubble) bubble.classList.add('visible');
                }

                function hideBubble(id) {
                    const bubble = document.getElementById(id);
                    if (bubble) bubble.classList.remove('visible');
                }

                function adjustQty(id, delta) {
                    const input = document.getElementById(id);
                    let value = parseInt(input.value) || 0;
                    value = Math.max(0, value + delta);
                    input.value = value;
                }

                function adjustValue(id, delta) {
                    const input = document.getElementsByName(id)[0] || document.getElementById(id);
                    let value = parseFloat(input.value) || 0;
                    value = Math.max(0, value + delta).toFixed(2);
                    input.value = value;
                    debouncedUpdateShippingOptions();
                }

                function selectShippingMethod(method) {
                    const buttons = document.querySelectorAll('.shipping-btn');
                    buttons.forEach(btn => btn.classList.remove('active'));
                    const selectedBtn = document.querySelector(\`.shipping-btn[data-method="\${method}"]\`);
                    selectedBtn.classList.add('active');
                    document.getElementById('ship_method').value = method;

                    const flatRateFields = document.getElementById('flatRateFields');
                    const calculatedFields = document.getElementById('calculatedFields');

                    flatRateFields.classList.add('hidden');
                    calculatedFields.classList.add('hidden');

                    if (method === 'flat_rate') {
                        flatRateFields.classList.remove('hidden');
                    } else if (method === 'calculated') {
                        calculatedFields.classList.remove('hidden');
                        debouncedUpdateShippingOptions();
                    }
                }

                function addPackage() {
                    packageCount++;
                    const packages = document.getElementById('packages');
                    const newPackage = document.createElement('div');
                    newPackage.className = 'package';
                    newPackage.setAttribute('data-package', packageCount);
                    newPackage.innerHTML = \`
                        <h3>Pkg \${packageCount}</h3>
                        <div class="columns">
                            <div class="left-column">
                                <div class="form-group dimension-group">
                                    <label>Dimensions:</label>
                                    <div class="dimension-row">
                                        <div class="number-input">
                                            <input type="number" name="shipping[\${packageCount}][length]" step="0.01" class="narrow" placeholder="L" oninput="debouncedUpdateShippingOptions()">
                                            <div class="arrows">
                                                <button type="button" onclick="adjustValue('shipping[\${packageCount}][length]', 0.01)">▲</button>
                                                <button type="button" onclick="adjustValue('shipping[\${packageCount}][length]', -0.01)">▼</button>
                                            </div>
                                        </div>
                                        <div class="number-input">
                                            <input type="number" name="shipping[\${packageCount}][width]" step="0.01" class="narrow" placeholder="W" oninput="debouncedUpdateShippingOptions()">
                                            <div class="arrows">
                                                <button type="button" onclick="adjustValue('shipping[\${packageCount}][width]', 0.01)">▲</button>
                                                <button type="button" onclick="adjustValue('shipping[\${packageCount}][width]', -0.01)">▼</button>
                                            </div>
                                        </div>
                                        <div class="number-input">
                                            <input type="number" name="shipping[\${packageCount}][height]" step="0.01" class="narrow" placeholder="H" oninput="debouncedUpdateShippingOptions()">
                                            <div class="arrows">
                                                <button type="button" onclick="adjustValue('shipping[\${packageCount}][height]', 0.01)">▲</button>
                                                <button type="button" onclick="adjustValue('shipping[\${packageCount}][height]', -0.01)">▼</button>
                                            </div>
                                        </div>
                                        <select name="shipping[\${packageCount}][dimension_unit]" onchange="debouncedUpdateShippingOptions()">
                                            <option value="">Unit</option>
                                            <option value="in">Inches</option>
                                            <option value="cm">Centimeters</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="right-column">
                                <div class="form-group inline-group">
                                    <label for="shipping[\${packageCount}][weight]">Weight:</label>
                                    <div class="number-input">
                                        <input type="number" name="shipping[\${packageCount}][weight]" step="0.01" class="narrow" oninput="debouncedUpdateShippingOptions()">
                                        <div class="arrows">
                                            <button type="button" onclick="adjustValue('shipping[\${packageCount}][weight]', 0.01)">▲</button>
                                            <button type="button" onclick="adjustValue('shipping[\${packageCount}][weight]', -0.01)">▼</button>
                                        </div>
                                    </div>
                                    <select name="shipping[\${packageCount}][weight_unit]" onchange="debouncedUpdateShippingOptions()">
                                        <option value="">Unit</option>
                                        <option value="lbs">Pounds</option>
                                        <option value="kg">Kilograms</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="remove-btn" onclick="removePackage(\${packageCount})">Remove Package</button>
                    \`;
                    packages.appendChild(newPackage);
                    debouncedUpdateShippingOptions();
                }

                function removePackage(packageNum) {
                    const packageDiv = document.querySelector(\`.package[data-package="\${packageNum}"]\`);
                    if (packageDiv) packageDiv.remove();
                    debouncedUpdateShippingOptions();
                }

                function updateShippingOptions() {
                    console.log('Updating shipping options');
                    const packages = document.querySelectorAll('.package');
                    const packageData = Array.from(packages).map(pkg => {
                        const num = pkg.getAttribute('data-package');
                        return {
                            length: parseFloat(pkg.querySelector(\`input[name="shipping[\${num}][length]"]\`).value) || 0,
                            width: parseFloat(pkg.querySelector(\`input[name="shipping[\${num}][width]"]\`).value) || 0,
                            height: parseFloat(pkg.querySelector(\`input[name="shipping[\${num}][height]"]\`).value) || 0,
                            weight: parseFloat(pkg.querySelector(\`input[name="shipping[\${num}][weight]"]\`).value) || 0,
                            dimensionUnit: pkg.querySelector(\`select[name="shipping[\${num}][dimension_unit]"]\`).value || 'in',
                            weightUnit: pkg.querySelector(\`select[name="shipping[\${num}][weight_unit]"]\`).value || 'lbs',
                            originZip: '${req.session.user?.zip || '94105'}'
                        };
                    });
                    console.log('Package data sent:', packageData);

                    const hasValidPackage = packageData.some(pkg => pkg.length > 0 && pkg.width > 0 && pkg.height > 0 && pkg.weight > 0);
                    const url = hasValidPackage ? '/shipping/options' : '/shipping/services';

                    fetch(url, {
                        method: hasValidPackage ? 'POST' : 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        body: hasValidPackage ? JSON.stringify(packageData) : null
                    })
                    .then(response => {
                        console.log('Shipping response status:', response.status);
                        if (!response.ok) throw new Error(\`Fetch failed with status: \${response.status}\`);
                        return response.json();
                    })
                    .then(data => {
                        console.log('Shipping data received:', data);
                        const servicesList = document.getElementById('servicesList');
                        if (data.services && data.services.length > 0) {
                            const carriers = {};
                            data.services.forEach(service => {
                                if (!carriers[service.provider]) carriers[service.provider] = [];
                                carriers[service.provider].push(service);
                            });

                            servicesList.innerHTML = Object.entries(carriers).map(([provider, services]) => {
                                const logoMap = {
                                    'USPS': '/media/usps.png',
                                    'UPS': '/media/ups.png',
                                    'FedEx': '/media/fedex.png'
                                };
                                const logoUrl = logoMap[provider] || '/media/default-logo.png';
                                return \`
                                    <div class="service-card">
                                        <img src="\${logoUrl}" alt="\${provider}">
                                        \${services.map(service => \`
                                            <label>
                                                <input type="checkbox" name="shipping_services[]" value="\${service.code}">
                                                \${service.service}
                                            </label>
                                        \`).join('')}
                                    </div>
                                \`;
                            }).join('');
                        } else {
                            servicesList.innerHTML = '<p>No shipping options available.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching shipping options:', error);
                        document.getElementById('servicesList').innerHTML = '<p>Unable to load shipping options.</p>';
                    });
                }

                const debouncedUpdateShippingOptions = debounce(updateShippingOptions, 500);

                function addVariantKind() {
                    if (kindCount >= 5) return alert('Max 5 variant kinds');
                    kindCount++;
                    const variantKinds = document.getElementById('variantKinds');
                    const div = document.createElement('div');
                    div.className = 'variant-kind';
                    div.setAttribute('data-kind', kindCount);
                    div.innerHTML = \`
                        <h3>Variant Kind \${kindCount}</h3>
                        <label>Type:
                            <select name="variant_kinds[\${kindCount}][type]" onchange="handleVariantTypeChange(\${kindCount}, this)">
                                <option value="Size">Size</option>
                                <option value="Color">Color</option>
                                <option value="Pattern">Pattern</option>
                                <option value="Material">Material</option>
                                <option value="Style">Style</option>
                                <option value="Finish">Finish</option>
                                <option value="Shape">Shape</option>
                                <option value="Flavor">Flavor</option>
                                <option value="Weight">Weight</option>
                                <option value="Length">Length</option>
                                <option value="custom">Add Custom Kind</option>
                                ${customKindOptions}
                            </select>
                            <button type="button" class="edit-btn" onclick="editVariantKind(\${kindCount})">Edit</button>
                            <button type="button" class="delete-btn" onclick="deleteVariantKind(\${kindCount})">Delete</button>
                        </label>
                        <div id="customKindInput\${kindCount}" class="hidden">
                            <input type="text" placeholder="Enter custom kind name" id="customKindName\${kindCount}">
                            <button type="button" onclick="saveCustomKind(\${kindCount})">Save Custom Kind</button>
                        </div>
                        <div class="options" id="options\${kindCount}">
                            <input type="text" placeholder="Add option" id="optionInput\${kindCount}">
                            <button type="button" onclick="addOption(\${kindCount}, document.getElementById('optionInput\${kindCount}'))">Create</button>
                        </div>
                    \`;
                    variantKinds.appendChild(div);
                }

                async function handleVariantTypeChange(kindId, select) {
                    const customInputDiv = document.getElementById(\`customKindInput\${kindId}\`);
                    if (select.value === 'custom') {
                        customInputDiv.classList.remove('hidden');
                    } else {
                        customInputDiv.classList.add('hidden');
                    }
                }

                async function saveCustomKind(kindId) {
                    const customKindNameInput = document.getElementById(\`customKindName\${kindId}\`);
                    const customKindName = customKindNameInput.value.trim();
                    if (!customKindName) return alert('Please enter a custom kind name');

                    try {
                        const response = await fetch('/shop/product/add-custom-kind', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: customKindName, user_id: ${req.session.user?.id || 1000000005} })
                        });
                        if (!response.ok) throw new Error('Failed to save custom kind');
                        const data = await response.json();
                        const select = document.querySelector(\`select[name="variant_kinds[\${kindId}][type]"]\`);
                        select.innerHTML += \`<option value="\${customKindName}">\${customKindName} (Edit | Delete)</option>\`;
                        select.value = customKindName;
                        customKindNameInput.value = '';
                        document.getElementById(\`customKindInput\${kindId}\`).classList.add('hidden');
                    } catch (error) {
                        console.error('Error saving custom kind:', error);
                        alert('Failed to save custom kind');
                    }
                }

                async function editVariantKind(kindId) {
                    const select = document.querySelector(\`select[name="variant_kinds[\${kindId}][type]"]\`);
                    const currentValue = select.value;
                    if (currentValue === 'custom' || !currentValue) return;

                    const newName = prompt('Enter new name for this variant kind:', currentValue);
                    if (!newName || newName === currentValue) return;

                    try {
                        const response = await fetch('/shop/product/update-custom-kind', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ old_name: currentValue, new_name: newName, user_id: ${req.session.user?.id || 1000000005} })
                        });
                        if (!response.ok) throw new Error('Failed to update custom kind');
                        select.querySelector(\`option[value="\${currentValue}"]\`).textContent = \`\${newName} (Edit | Delete)\`;
                        select.value = newName;
                    } catch (error) {
                        console.error('Error updating custom kind:', error);
                        alert('Failed to update custom kind');
                    }
                }

                async function deleteVariantKind(kindId) {
                    if (!confirm('Are you sure? This will delete the variant kind and all associated options.')) return;
                    const select = document.querySelector(\`select[name="variant_kinds[\${kindId}][type]"]\`);
                    const kindName = select.value;
                    if (kindName === 'custom' || !kindName) return;

                    try {
                        const response = await fetch('/shop/product/delete-custom-kind', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: kindName, user_id: ${req.session.user?.id || 1000000005} })
                        });
                        if (!response.ok) throw new Error('Failed to delete custom kind');
                        document.querySelector(\`.variant-kind[data-kind="\${kindId}"]\`).remove();
                        updateVariationsList();
                    } catch (error) {
                        console.error('Error deleting custom kind:', error);
                        alert('Failed to delete custom kind');
                    }
                }

                function addOption(kindId, input) {
                    const value = input.value.trim();
                    if (!value) return;
                    const optionsDiv = document.getElementById(\`options\${kindId}\`);
                    const tag = document.createElement('span');
                    tag.className = 'tag';
                    tag.dataset.value = value;
                    tag.innerHTML = \`\${value} <button type="button" onclick="removeOption(\${kindCount}, '\${value}')">X</button>\`;
                    optionsDiv.insertBefore(tag, input);
                    input.value = '';
                    updateVariationsList();
                }

                async function removeOption(kindId, value) {
                    if (!confirm('Are you sure? This will delete all active, draft, and potential products using this option.')) return;
                    const optionsDiv = document.getElementById(\`options\${kindId}\`);
                    const tag = optionsDiv.querySelector(\`.tag[data-value="\${value}"]\`);
                    if (tag) tag.remove();
                    await fetch('/shop/product/delete-option', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parent_id: document.getElementById('id').value, option: value })
                    });
                    updateVariationsList();
                }

                async function updateVariationsList() {
                    saveFormData();
                    const name = document.getElementById('name').value || 'Artwork';
                    const kinds = formData.variant_kinds.filter(k => k.options.length > 0);
                    const combos = generateCombinations(kinds);
                    const response = await fetch('/shop/product/drafts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parent_id: document.getElementById('id').value })
                    });
                    const drafts = await response.json();
                    const draftNames = drafts.map(d => d.name);

                    const variationsList = document.getElementById('variationsList');
                    variationsList.innerHTML = combos.map(combo => {
                        const variantName = \`\${name} (\${combo.map(c => c.option).join(', ')})\`;
                        const isDraft = draftNames.includes(variantName);
                        return \`
                            <div class="variation-item \${isDraft ? '' : 'ghost'}" data-name="\${variantName}">
                                <input type="checkbox" name="variants[]" value="\${variantName}">
                                \${variantName}
                                \${isDraft ? 
                                    '<button onclick="editVariantInline(\\\'' + variantName + '\\\')">[+]</button> ' +
                                    '<button onclick="editVariantFull(\\\'' + variantName + '\\\')">Edit</button>' : 
                                    '<button onclick="addVariant(\\\'' + variantName + '\\\')">Add Variant</button>'}
                            </div>
                        \`;
                    }).join('');
                }

                async function addVariant(name) {
                    await fetch('/shop/product/add-variant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parent_id: document.getElementById('id').value, name })
                    });
                    updateVariationsList();
                }

                async function bulkAddVariants() {
                    const checked = Array.from(document.querySelectorAll('.variation-item input:checked')).map(item => item.value);
                    if (checked.length === 0) return;
                    await fetch('/shop/product/add-variants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parent_id: document.getElementById('id').value, names: checked })
                    });
                    updateVariationsList();
                }

                async function addAllVariants() {
                    const ghosts = Array.from(document.querySelectorAll('.variation-item.ghost')).map(item => item.dataset.name);
                    if (ghosts.length === 0) return;
                    await fetch('/shop/product/add-variants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ parent_id: document.getElementById('id').value, names: ghosts })
                    });
                    updateVariationsList();
                }

                function editVariantInline(name) {
                    const item = document.querySelector(\`.variation-item[data-name="\${name}"]\`);
                    const existingEdit = item.querySelector('.edit-form');
                    if (existingEdit) return; // Prevent multiple instances

                    const editDiv = document.createElement('div');
                    editDiv.className = 'edit-form';
                    editDiv.innerHTML = \`
                        <div class="form-group">
                            <label>Price: <input type="number" name="variant_price" step="0.01" value="\${formData.price || ''}"></label>
                            <label>Description: <textarea name="variant_description">\${formData.description || ''}</textarea></label>
                            <label>Weight: <input type="number" name="variant_weight" step="0.01" value="\${formData.weight || ''}"></label>
                            <button type="button" onclick="saveVariant('\${name}', this.parentElement)">Save</button>
                            <button type="button" onclick="this.parentElement.parentElement.remove()">Cancel</button>
                        </div>
                    \`;
                    item.appendChild(editDiv);
                }

                async function saveVariant(name, form) {
                    const data = {
                        parent_id: document.getElementById('id').value,
                        name,
                        price: form.querySelector('[name="variant_price"]').value,
                        description: form.querySelector('[name="variant_description"]').value,
                        weight: form.querySelector('[name="variant_weight"]').value
                    };
                    console.log('Saving variant:', data);
                    await fetch('/shop/product/update-variant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    form.parentElement.remove();
                    updateVariationsList();
                }

                function editVariantFull(name) {
                    const url = '/shop/product/edit_variant?parent_id=' + document.getElementById('id').value + '&name=' + encodeURIComponent(name);
                    window.location.href = url; // Redirect to full edit page (to be implemented)
                }

                function bulkEditVariants() {
                    const checked = Array.from(document.querySelectorAll('.variation-item input:checked')).map(item => item.value);
                    if (checked.length === 0) return;
                    const bulkEditForm = document.getElementById('bulkEditForm');
                    bulkEditForm.classList.remove('hidden');
                    bulkEditForm.innerHTML = \`
                        <h3>Bulk Edit Variants</h3>
                        <label>Price: <input type="number" name="bulk_price" step="0.01" value="\${formData.price || ''}"></label>
                        <label>Description: <textarea name="bulk_description">\${formData.description || ''}</textarea></label>
                        <label>Weight: <input type="number" name="bulk_weight" step="0.01" value="\${formData.weight || ''}"></label>
                        <label><input type="checkbox" name="apply_to_master"> Apply to master data too?</label>
                        <button type="button" onclick="saveBulkEdit()">Save</button>
                    \`;
                }

                async function saveBulkEdit() {
                    const form = document.getElementById('bulkEditForm');
                    const checked = Array.from(document.querySelectorAll('.variation-item input:checked')).map(item => item.value);
                    const data = {
                        parent_id: document.getElementById('id').value,
                        names: checked,
                        price: form.querySelector('[name="bulk_price"]').value,
                        description: form.querySelector('[name="bulk_description"]').value,
                        weight: form.querySelector('[name="bulk_weight"]').value,
                        apply_to_master: form.querySelector('[name="apply_to_master"]').checked
                    };
                    await fetch('/shop/product/bulk-update-variants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    form.classList.add('hidden');
                    updateVariationsList();
                }

                function generateCombinations(kinds) {
                    return kinds.reduce((acc, kind) => {
                        const result = [];
                        acc.forEach(a => {
                            kind.options.forEach(opt => {
                                result.push([...a, { type: kind.type, option: opt }]);
                            });
                        });
                        return result.length ? result : kind.options.map(opt => [{ type: kind.type, option: opt }]);
                    }, []);
                }

                function goBack() {
                    if (currentStep > 0) goToStep(currentStep - 1);
                }

                function goNext() {
                    console.log('Next clicked, currentStep:', currentStep, 'steps.length:', steps.length);
                    if (currentStep < steps.length - 1) {
                        const form = document.getElementById('addProductForm');
                        const currentSection = document.getElementById(steps[currentStep]);
                        const requiredInputs = currentSection.querySelectorAll('input[required], select[required], textarea[required]');
                        let isValid = true;
                        requiredInputs.forEach(input => {
                            if (!input.checkValidity()) {
                                isValid = false;
                                input.reportValidity();
                            }
                        });
                        console.log('Section validity:', isValid);
                        if (!isValid) {
                            console.log('Section invalid, stopping');
                            return;
                        }
                        goToStep(currentStep + 1);
                    }
                }

                function updateProgress() {
                    const stepsEls = document.querySelectorAll('.step');
                    stepsEls.forEach((el, index) => {
                        el.classList.toggle('active', index === currentStep);
                        if (formData.product_type === 'simple' && el.textContent === 'Variations') {
                            el.classList.add('hidden');
                        } else {
                            el.classList.remove('hidden');
                        }
                    });
                }

                function updateButtons() {
                    const backBtn = document.getElementById('backBtn');
                    const nextBtn = document.getElementById('nextBtn');
                    const createBtn = document.getElementById('createBtn');
                    if (!backBtn || !nextBtn || !createBtn) return;

                    backBtn.classList.toggle('hidden', currentStep <= 0);
                    nextBtn.classList.toggle('hidden', currentStep >= steps.length - 1);
                    createBtn.classList.toggle('hidden', currentStep < steps.length - 1);
                }

                function confirmCancel() {
                    document.getElementById('cancelWarning').classList.remove('hidden');
                }

                async function cancelDraft() {
                    await fetch('/shop/product/cancel-draft', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: document.getElementById('id').value })
                    });
                    window.location.href = '/shop/product/add_new';
                }

                const debounce = (func, wait) => {
                    let timeout;
                    return (...args) => {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => func.apply(this, args), wait);
                    };
                };
            </script>
        `;
        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /add_new
router.post('/add_new', async (req, res) => {
    const db = await getDb();
    try {
        console.log('Starting POST /add_new', new Date().toISOString());
        
        const isVariation = req.body.product_type === 'variations';
        const status = req.body.action === 'draft' ? 'draft' : 'active';

        const productData = {
            id: req.body.id,
            name: req.body.name || 'Artwork',
            price: req.body.price || 0,
            available_qty: req.body.available_qty || 0,
            vendor_id: req.body.vendor_id || 1000000005,
            category_id: req.body.category_id || 1,
            description: req.body.description || '',
            sku: req.body.sku || 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            status: status,
            created_by: req.body.created_by || 1000000005,
            width: req.body.width || 0,
            height: req.body.height || 0,
            depth: req.body.depth || 0,
            weight: req.body.weight || 0,
            dimension_unit: req.body.dimension_unit || 'in',
            weight_unit: req.body.weight_unit || 'lbs'
        };
        console.log('Updating products table', new Date().toISOString());
        await db.query('UPDATE products SET ? WHERE id = ?', [productData, productData.id]);
        const parentId = productData.id;

        if (req.body.category_id) {
            console.log('Managing categories', new Date().toISOString());
            await db.query('DELETE FROM product_categories WHERE product_id = ?', [parentId]);
            const additionalCategories = req.body['additional_categories[]'] || [];
            const allCategories = [req.body.category_id, ...additionalCategories.filter(cat => cat)].slice(0, 4);
            for (const catId of allCategories) {
                await db.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [parentId, catId]);
            }
        }

        if (status === 'active' && req.body.ship_method) {
            console.log('Processing shipping', new Date().toISOString());
            await db.query('DELETE FROM product_shipping WHERE product_id = ?', [parentId]);
            const shippingServices = req.body['shipping_services[]'] ? JSON.stringify(req.body['shipping_services[]']) : null;
            if (req.body.ship_method === 'flat_rate' && req.body.ship_rate) {
                await db.query(
                    'INSERT INTO product_shipping (product_id, ship_method, ship_rate, shipping_type) VALUES (?, ?, ?, ?)',
                    [parentId, 'flat_rate', req.body.ship_rate, 'free']
                );
            } else if (req.body.ship_method === 'calculated' && req.body.shipping) {
                for (const [packageNum, shipping] of Object.entries(req.body.shipping)) {
                    if (shipping.length || shipping.width || shipping.height || shipping.weight) {
                        await db.query(
                            'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit, ship_method, shipping_type, shipping_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [parentId, packageNum, shipping.length || null, shipping.width || null, shipping.height || null, shipping.weight || null, shipping.dimension_unit || null, shipping.weight_unit || null, 'calculated', 'calculated', shippingServices]
                        );
                    }
                }
            } else if (req.body.ship_method === 'free') {
                await db.query(
                    'INSERT INTO product_shipping (product_id, ship_method, shipping_type) VALUES (?, ?, ?)',
                    [parentId, 'free', 'free']
                );
            }
        }

        if (status === 'active' && isVariation && req.body.variant_kinds) {
            console.log('Processing variants', new Date().toISOString());
            const variants = [];
            for (const [kindId, kind] of Object.entries(req.body.variant_kinds)) {
                if (kind.type && kind.options) {
                    variants.push({ type: kind.type, options: kind.options.filter(opt => opt) });
                }
            }
            await db.query('UPDATE products SET status = ? WHERE parent_id = ? AND status = ?', [status, parentId, 'draft']);
        }

        console.log('Sending success response', new Date().toISOString());
        const [createdProducts] = await db.query('SELECT id, name, sku FROM products WHERE id = ?', [parentId]);
        const productCards = createdProducts.map(p => `
            <div class="product">
                <h3>${p.name}</h3>
                <p>ID: ${p.id} | SKU: ${p.sku}</p>
            </div>
        `).join('');

        req.session.draftId = null;
        const successHtml = `
            ${header}
            <main>
                <div id="successPopup" style="position: relative; margin: 20px auto; max-width: 900px; background: white; padding: 20px; border: 5px solid #3e1c56;">
                    <p>New item successfully created</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                        ${productCards}
                    </div>
                    <button onclick="window.location.href = '/shop/product/add_new';">OK</button>
                </div>
            </main>
            ${footer}
        `;
        res.send(successHtml);
    } catch (err) {
        console.error('Error in POST /add_new:', err.message, new Date().toISOString());
        res.status(500).send(`
            ${header}
            <main>
                <h2>Server Error</h2>
                <p>Something went wrong while saving your product. Please try again or contact support.</p>
                <p>Error: ${err.message}</p>
                <button onclick="window.location.href = '/shop/product/add_new';">Back</button>
            </main>
            ${footer}
        `);
    } finally {
        await db.end();
    }
});

// POST /draft
router.post('/draft', async (req, res) => {
    const db = await getDb();
    try {
        const userId = req.body.user_id || req.session.user?.id;
        if (!userId) throw new Error('User ID required');

        const [availableSkus] = await db.query(`
            SELECT COUNT(*) as count 
            FROM vendor_sku_log 
            WHERE vendor_id = ? 
            AND product_id IS NULL
        `, [userId]);
        if (availableSkus[0].count < 10) {
            await db.query('CALL replenish_vendor_skus(?, 100)', [userId]);
        }

        const [skuRow] = await db.query(`
            SELECT id, sku 
            FROM vendor_sku_log 
            WHERE vendor_id = ? 
            AND product_id IS NULL 
            ORDER BY sku ASC 
            LIMIT 1
        `, [userId]);
        let nextSku = 'ART-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        let skuId = null;
        if (skuRow.length > 0 && skuRow[0].sku) {
            nextSku = skuRow[0].sku;
            skuId = skuRow[0].id;
        }

        const productData = {
            name: 'Artwork',
            price: 0.00,
            vendor_id: userId,
            category_id: 1,
            sku: nextSku,
            created_by: userId,
            status: 'draft',
            product_type: req.body.product_type
        };
        const [result] = await db.query('INSERT INTO products SET ?', productData);
        const productId = result.insertId;

        if (skuId) {
            await db.query('UPDATE vendor_sku_log SET product_id = ? WHERE id = ?', [productId, skuId]);
        }
        
        req.session.draftId = productId;
        res.json({ id: productId });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /add-variant
router.post('/add-variant', async (req, res) => {
    const db = await getDb();
    try {
        const userId = req.session.user?.id || 1000000005;
        const [skuRow] = await db.query(`
            SELECT id, sku 
            FROM vendor_sku_log 
            WHERE vendor_id = ? 
            AND product_id IS NULL 
            ORDER BY sku ASC 
            LIMIT 1
        `, [userId]);
        let nextSku = 'ART-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        let skuId = null;
        if (skuRow.length > 0 && skuRow[0].sku) {
            nextSku = skuRow[0].sku;
            skuId = skuRow[0].id;
        }

        const variantData = {
            parent_id: req.body.parent_id,
            name: req.body.name,
            status: 'draft',
            vendor_id: userId,
            created_by: userId,
            sku: nextSku
        };
        const [result] = await db.query('INSERT INTO products SET ?', variantData);
        if (skuId) {
            await db.query('UPDATE vendor_sku_log SET product_id = ? WHERE id = ?', [result.insertId, skuId]);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /add-variants
router.post('/add-variants', async (req, res) => {
    const db = await getDb();
    try {
        const userId = req.session.user?.id || 1000000005;
        for (const name of req.body.names) {
            const [skuRow] = await db.query(`
                SELECT id, sku 
                FROM vendor_sku_log 
                WHERE vendor_id = ? 
                AND product_id IS NULL 
                ORDER BY sku ASC 
                LIMIT 1
            `, [userId]);
            let nextSku = 'ART-' + Math.random().toString(36).substr(2, 8).toUpperCase();
            let skuId = null;
            if (skuRow.length > 0 && skuRow[0].sku) {
                nextSku = skuRow[0].sku;
                skuId = skuRow[0].id;
            }

            const variantData = {
                parent_id: req.body.parent_id,
                name,
                status: 'draft',
                vendor_id: userId,
                created_by: userId,
                sku: nextSku
            };
            const [result] = await db.query('INSERT INTO products SET ?', variantData);
            if (skuId) {
                await db.query('UPDATE vendor_sku_log SET product_id = ? WHERE id = ?', [result.insertId, skuId]);
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /update-variant
router.post('/update-variant', async (req, res) => {
    const db = await getDb();
    try {
        const updates = {};
        if (req.body.price) updates.price = req.body.price;
        if (req.body.description) updates.description = req.body.description;
        if (req.body.weight) updates.weight = req.body.weight;
        if (Object.keys(updates).length > 0) {
            await db.query('UPDATE products SET ? WHERE parent_id = ? AND name = ?', [updates, req.body.parent_id, req.body.name]);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /bulk-update-variants
router.post('/bulk-update-variants', async (req, res) => {
    const db = await getDb();
    try {
        const updates = {};
        if (req.body.price) updates.price = req.body.price;
        if (req.body.description) updates.description = req.body.description;
        if (req.body.weight) updates.weight = req.body.weight;
        if (Object.keys(updates).length > 0) {
            for (const name of req.body.names) {
                await db.query('UPDATE products SET ? WHERE parent_id = ? AND name = ?', [updates, req.body.parent_id, name]);
            }
            if (req.body.apply_to_master) {
                await db.query('UPDATE products SET ? WHERE id = ?', [updates, req.body.parent_id]);
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /drafts
router.post('/drafts', async (req, res) => {
    const db = await getDb();
    try {
        const [drafts] = await db.query('SELECT name FROM products WHERE parent_id = ? AND status = "draft"', [req.body.parent_id]);
        res.json(drafts);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /delete-option
router.post('/delete-option', async (req, res) => {
    const db = await getDb();
    try {
        await db.query('UPDATE products SET status = "deleted", created_by = 1, available_qty = 0 WHERE parent_id = ? AND name LIKE ?', [req.body.parent_id, `%${req.body.option}%`]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /cancel-draft
router.post('/cancel-draft', async (req, res) => {
    const db = await getDb();
    try {
        await db.query('UPDATE products SET status = "deleted", created_by = 1, available_qty = 0 WHERE id = ? OR parent_id = ?', [req.body.id, req.body.id]);
        req.session.draftId = null;
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /add-custom-kind
router.post('/add-custom-kind', async (req, res) => {
    const db = await getDb();
    try {
        const { name, user_id } = req.body;
        if (!name || !user_id) throw new Error('Name and user_id required');
        const [result] = await db.query('INSERT INTO variant_kinds (name, user_id) VALUES (?, ?)', [name, user_id]);
        res.json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /update-custom-kind
router.post('/update-custom-kind', async (req, res) => {
    const db = await getDb();
    try {
        const { old_name, new_name, user_id } = req.body;
        if (!old_name || !new_name || !user_id) throw new Error('Old name, new name, and user_id required');
        await db.query('UPDATE variant_kinds SET name = ? WHERE name = ? AND user_id = ?', [new_name, old_name, user_id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

// POST /delete-custom-kind
router.post('/delete-custom-kind', async (req, res) => {
    const db = await getDb();
    try {
        const { name, user_id } = req.body;
        if (!name || !user_id) throw new Error('Name and user_id required');
        await db.query('DELETE FROM variant_kinds WHERE name = ? AND user_id = ?', [name, user_id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        await db.end();
    }
});

module.exports = router;