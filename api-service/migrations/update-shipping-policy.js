#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function updatePolicy() {
  const policyText = `<p>At <strong>Brakebee LLC</strong> ("Brakebee," "we," "us," or "our"), we partner with independent artists to ship your purchases from Brakebee.com ("the Site") as smoothly as possible. Because many products are handmade or unique, shipping details may vary by seller. This Shipping Policy explains how shipping works, including seller-specific rules and our default standards.</p>

<h2>1. Seller-Specific Shipping Policies</h2>

<p>Many artists provide their own shipping policies detailing handling times, methods, and costs. When a seller publishes a shipping policy on a product page or artist profile, those terms apply to orders from that seller.</p>

<p>Buyers should review seller policies before purchasing. If you need clarification, email us at <a href="mailto:support@brakebee.com">support@brakebee.com</a> and we'll help.</p>

<h2>2. Brakebee Default Shipping Policy</h2>

<p>If a seller does not provide a specific shipping policy, the following default applies:</p>

<p><strong>Standard Handling Time:</strong> Most orders ship within 3 business days of purchase. Some artists may require additional time based on their production or travel schedule, and we will notify you if extended handling is necessary.</p>

<h3>Priority / Expedited Handling:</h3>

<ul>
<li>Selecting priority or expedited shipping reduces handling and transit time, but delivery dates are not guaranteed.</li>
<li>Expedited services (e.g., 2-day or overnight) incur additional charges.</li>
<li>If you need an item by a specific date, please contact <a href="mailto:support@brakebee.com">support@brakebee.com</a> before purchasing so we can confirm whether the seller can meet your timeline.</li>
</ul>

<p><strong>Shipping Costs:</strong> Buyers are responsible for shipping charges unless the seller's policy states otherwise or the order qualifies under the Brakebee Marketplace Guarantee (e.g., damaged or mis-shipped items).</p>

<p><em>Shipping times are estimates and may vary based on seller availability, carrier performance, or seasonal volume.</em></p>

<h2>3. Shipping Methods & Carriers</h2>

<p>Sellers may ship using:</p>

<ul>
<li><strong>UPS, FedEx, USPS</strong> (standard shipments)</li>
<li><strong>Freight carriers</strong> for oversized or heavy artwork</li>
<li><strong>Private or regional couriers</strong> for local deliveries</li>
</ul>

<p>Tracking information will be provided when available. Some freight or private courier shipments may have limited tracking visibility.</p>

<h2>4. International Shipping</h2>

<p>Some sellers offer international shipping, which may involve additional costs such as duties, taxes, or higher shipping fees. Buyers are responsible for all import-related charges.</p>

<p>To confirm international availability or estimated costs, contact <a href="mailto:support@brakebee.com">support@brakebee.com</a>.</p>

<h2>5. Delivery Expectations & Support</h2>

<p>Once your order ships, delivery time depends on the carrier, method, and destination. While delays can occur due to carrier issues, weather, or holidays, Brakebee will assist in resolving any concerns by coordinating with the seller and carrier.</p>

<p>If your order arrives damaged, please follow our <a href="/policies/returns">Return Policy</a> for next steps. All orders involving damaged, defective, or mis-shipped items are protected under the <strong>Brakebee Marketplace Guarantee</strong>.</p>

<h2>6. Contact Us</h2>

<p>For shipping questions or assistance:</p>

<p><a href="mailto:support@brakebee.com">support@brakebee.com</a></p>

<h2>7. Updates to This Policy</h2>

<p>We may update this Shipping Policy from time to time. Changes will apply to orders placed after the revised policy is posted.</p>

<p><strong>Thank you for supporting independent artists through Brakebee.com!</strong></p>`;

  try {
    // Update existing active policy or insert new one
    const [existing] = await db.query(
      'SELECT id FROM shipping_policies WHERE user_id IS NULL AND status = ? LIMIT 1',
      ['active']
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE shipping_policies SET policy_text = ?, updated_at = NOW() WHERE id = ?',
        [policyText, existing[0].id]
      );
      console.log('✓ Updated existing shipping policy (ID: ' + existing[0].id + ')');
    } else {
      await db.query(
        'INSERT INTO shipping_policies (user_id, policy_text, status) VALUES (NULL, ?, ?)',
        [policyText, 'active']
      );
      console.log('✓ Inserted new shipping policy');
    }

    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error updating policy:', error);
    await db.end();
    process.exit(1);
  }
}

updatePolicy();

