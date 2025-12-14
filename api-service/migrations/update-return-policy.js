#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function updatePolicy() {
  const policyText = `<p>At <strong>Brakebee LLC</strong> ("Brakebee," "we," "us," or "our"), we want you to love the art you discover on Brakebee.com ("the Site"). Because our platform features independent artists and studios, individual sellers may offer their own return terms. This policy explains how returns work, including seller-specific rules and our minimum marketplace guarantee that applies to every order.</p>

<h2>1. Seller-Specific Return Policies</h2>

<p>Many artists and vendors provide their own return or exchange policies. When a seller publishes a return policy on their product page or artist profile, those terms apply to your order, and we help ensure they are followed.</p>

<p>We encourage buyers to review the seller's return policy before completing a purchase. If you have questions about a seller's policy, contact us at <a href="mailto:support@brakebee.com">support@brakebee.com</a>.</p>

<h2>2. Brakebee Marketplace Guarantee (Minimum Standard for All Orders)</h2>

<p>Regardless of a seller's individual policy, Brakebee guarantees support for the following situations on every purchase:</p>

<ul>
<li><strong>Items that arrive damaged</strong></li>
<li><strong>Items that arrive defective</strong></li>
<li><strong>Items that are mis-shipped or incorrect</strong></li>
</ul>

<p>In these cases, buyers are eligible for a refund or replacement through Brakebee's support process. This minimum guarantee applies even if a seller does not offer additional return options.</p>

<h2>3. Default Return Policy (For Sellers Who Do Not Provide Their Own)</h2>

<p>If a seller does not specify a return policy, the following default applies:</p>

<ul>
<li><strong>Timeframe:</strong> Items may be returned within 30 days of the order date. Returned items must arrive back to the artist within that period.</li>
<li><strong>Condition:</strong> Items must be returned in original packaging and in new, unused condition.</li>
<li><strong>Shipping Costs:</strong> Return shipping is the buyer's responsibility unless the return falls under the Marketplace Guarantee.</li>
<li><strong>Process:</strong> To begin a return, email <a href="mailto:returns@brakebee.com">returns@brakebee.com</a> with your order number. We will provide instructions for returning the item to the artist.</li>
</ul>

<p>Some original artwork or made-to-order pieces may not be eligible for voluntary returns unless the seller offers them, but all orders remain covered under the minimum Marketplace Guarantee described above.</p>

<h2>4. Damaged Items</h2>

<p>If your order arrives damaged, contact us within <strong>48 hours</strong> at <a href="mailto:support@brakebee.com">support@brakebee.com</a> with photos of the item and packaging. We'll coordinate a replacement or refund under the Marketplace Guarantee and work directly with the seller and shipping carrier so you don't have to manage the claim.</p>

<p><em>Please keep all original packaging until the process is complete.</em></p>

<h2>5. Mis-Shipped Items</h2>

<p>If the wrong item arrives, we will correct the order at no additional cost. Once the incorrect item is returned in new condition, we will ship the correct one or issue a refund if the correct item is unavailable.</p>

<h2>6. Contact Us</h2>

<p>If you have questions about returns or this policy, please contact us:</p>

<p><a href="mailto:support@brakebee.com">support@brakebee.com</a></p>`;

  try {
    // Update existing active policy or insert new one
    const [existing] = await db.query(
      'SELECT id FROM return_policies WHERE user_id IS NULL AND status = ? LIMIT 1',
      ['active']
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE return_policies SET policy_text = ?, updated_at = NOW() WHERE id = ?',
        [policyText, existing[0].id]
      );
      console.log('✓ Updated existing return policy (ID: ' + existing[0].id + ')');
    } else {
      await db.query(
        'INSERT INTO return_policies (user_id, policy_text, status) VALUES (NULL, ?, ?)',
        [policyText, 'active']
      );
      console.log('✓ Inserted new return policy');
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

