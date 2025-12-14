#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function updateTerms() {
  const content = `<p>Welcome to Brakebee.com ("the Site"), operated by <strong>Brakebee LLC</strong> ("Brakebee," "we," "us," or "our"). These Terms of Use ("Terms") govern your access to and use of the Site and any related applications, services, and features (collectively, the "Services").</p>

<p>By accessing or using the Services, you agree to these Terms. If you do not agree, please discontinue use of the Services.</p>

<h2>1. Who May Use Our Services</h2>

<p>You may use the Services if you:</p>

<ul>
<li>Are at least 13 years old (or 16 in the EU).</li>
<li>Provide accurate and complete information when creating an account or making a purchase.</li>
<li>Comply with these Terms and all applicable laws.</li>
</ul>

<p>Certain features—such as vendor accounts, selling tools, hosted pages, or event management tools—may be subject to additional terms ("Add-On Terms"). Where Add-On Terms apply, they supplement and, if necessary, take precedence over these Terms.</p>

<h2>2. Acceptable Use of the Services</h2>

<p>We aim to provide a safe, creative, and respectful environment. You agree to use the Services responsibly and refrain from:</p>

<h3>Permitted Use</h3>

<ul>
<li>Browsing, buying, and selling artwork as allowed by the Services.</li>
<li>Uploading content that you own or have permission to share.</li>
<li>Communicating respectfully with artists, buyers, and our team.</li>
</ul>

<h3>Prohibited Conduct</h3>

<p>You may not:</p>

<ul>
<li>Engage in unlawful activities (fraud, infringement, theft, etc.).</li>
<li>Upload harmful, offensive, or misleading content.</li>
<li>Attempt to damage, disable, or disrupt the Services.</li>
<li>Scrape or harvest data without authorization.</li>
<li>Misrepresent your identity or impersonate others.</li>
<li>Circumvent our systems or violate marketplace integrity.</li>
</ul>

<p>We may suspend or terminate your access—without prior notice—if these Terms are violated.</p>

<h2>3. Your Content and Intellectual Property</h2>

<p>When you upload artwork, images, descriptions, or other materials ("User Content"), you grant us the limited rights described in our <a href="/policies/copyright">Copyright Policy</a> to display, host, and distribute that content through the Services.</p>

<p>You are responsible for ensuring that your content does not infringe on any third-party rights. If you believe your intellectual property has been used without permission, please refer to our <a href="/policies/copyright">Copyright Policy</a> for instructions on submitting a complaint.</p>

<h2>4. Purchases, Sellers, and Marketplace Role</h2>

<p>Brakebee is a curated online marketplace. Artists and independent sellers list and sell their own products through the Services.</p>

<h3>Buyers</h3>

<p>By placing an order, you agree to:</p>

<ul>
<li>Pay for your purchase using valid payment information.</li>
<li>Follow our <a href="/policies/shipping">Shipping Policy</a> and <a href="/policies/returns">Return Policy</a>.</li>
<li>Review any seller-specific policies posted on product or profile pages.</li>
</ul>

<h3>Sellers</h3>

<p>Sellers agree to:</p>

<ul>
<li>Accurately represent their items.</li>
<li>Fulfill orders promptly and in accordance with their stated policies.</li>
<li>Comply with applicable laws and our marketplace rules.</li>
</ul>

<p>Additional seller terms may apply and will be provided separately.</p>

<h3>Brakebee's Role</h3>

<p>Brakebee facilitates transactions but does not manufacture, store, or inspect most products sold on the Site. The artists and sellers are solely responsible for their listings and inventory.</p>

<p>Brakebee provides the <strong>Brakebee Marketplace Guarantee</strong>, which ensures minimum protections for orders that are damaged, defective, or mis-shipped. For other matters, buyers and sellers should work together to resolve disputes, and Brakebee may assist at our discretion.</p>

<h2>5. Your Account</h2>

<p>If you create an account, you are responsible for:</p>

<ul>
<li>Maintaining the confidentiality of your login credentials.</li>
<li>Ensuring your information remains accurate and up to date.</li>
<li>All activity conducted through your account.</li>
</ul>

<p>Notify us immediately at <a href="mailto:support@brakebee.com">support@brakebee.com</a> if you suspect unauthorized access.</p>

<h2>6. Privacy and Data</h2>

<p>Your use of the Services is also governed by our <a href="/policies/privacy">Privacy Policy</a> and <a href="/policies/cookies">Cookie Policy</a>, which explain how we collect and process personal information. By using the Services, you consent to those practices.</p>

<h2>7. Brakebee's Rights</h2>

<p>We may, at any time and without liability:</p>

<ul>
<li>Modify, update, or discontinue any part of the Services.</li>
<li>Remove content that violates these Terms or our policies.</li>
<li>Limit, suspend, or terminate accounts for misuse or violations.</li>
<li>Update these Terms, with changes applying after they are posted.</li>
</ul>

<h2>8. Disclaimers and Limitations of Liability</h2>

<p>The Services are provided <strong>"as is"</strong>, without warranties of any kind.</p>

<p>To the fullest extent allowed by law:</p>

<ul>
<li>We do not guarantee uninterrupted, error-free, or secure operation of the Services.</li>
<li>We are not responsible for the actions or items of users, sellers, or third parties.</li>
<li>Our total liability for any claim arising from your use of the Services is limited to the amount you paid us (if any) in the 12 months preceding the claim.</li>
</ul>

<p>Some jurisdictions may not allow certain disclaimers; in those cases, the minimum legally required rights remain.</p>

<h2>9. Indemnification</h2>

<p>You agree to indemnify, defend, and hold Brakebee harmless from claims, damages, and expenses (including legal fees) resulting from:</p>

<ul>
<li>Your use of the Services,</li>
<li>Your User Content, or</li>
<li>Your violation of these Terms or applicable law.</li>
</ul>

<h2>10. Dispute Resolution & Governing Law</h2>

<h3>Governing Law</h3>

<p>These Terms are governed by the laws of the State of Iowa, USA, without regard to conflict-of-law rules.</p>

<h3>Mandatory Arbitration</h3>

<p>Except where prohibited or for eligible small-claims matters, all disputes relating to the Services or these Terms will be resolved through binding arbitration in Osceola County, Iowa, under the applicable rules of the American Arbitration Association (AAA).</p>

<ul>
<li><strong>Arbitrator:</strong> A neutral arbitrator appointed through AAA or a comparable service.</li>
<li><strong>Finality:</strong> The arbitrator's decision is final and may be enforced in any court with jurisdiction.</li>
<li><strong>Costs:</strong> Each party pays their own legal fees. Brakebee covers arbitrator fees unless a claim is deemed frivolous.</li>
<li><strong>Confidentiality:</strong> Proceedings are confidential except as required by law.</li>
</ul>

<h3>Class Action Waiver</h3>

<p>By using the Services, you waive the right to participate in class actions, class arbitrations, or similar aggregated proceedings.</p>

<h3>Exceptions</h3>

<p>This arbitration agreement does not apply where arbitration is prohibited by law, and unaffected portions remain enforceable.</p>

<p>We encourage you to contact us first at <a href="mailto:support@brakebee.com">support@brakebee.com</a> to attempt informal resolution.</p>

<h2>11. Contact Us</h2>

<p>For questions about these Terms or your use of the Services:</p>

<p><a href="mailto:support@brakebee.com">support@brakebee.com</a></p>

<h2>12. Changes to These Terms</h2>

<p>We may update these Terms from time to time. The revised Terms take effect upon posting and apply to all subsequent use of the Services.</p>

<h2>13. Miscellaneous</h2>

<ul>
<li><strong>Entire Agreement:</strong> These Terms, together with our policies and Add-On Terms, constitute the full agreement between you and Brakebee.</li>
<li><strong>Severability:</strong> If any provision is found invalid, the remaining provisions remain in effect.</li>
<li><strong>No Waiver:</strong> Failure to enforce a provision is not a waiver of the right to enforce it later.</li>
</ul>

<hr />

<h2>Additional Terms</h2>

<p>The following additional terms apply to specific features and services:</p>

<ul class="terms-links">
<li><a href="/terms/verified">Verified Artist Terms</a></li>
<li><a href="/terms/shipping_labels">Shipping Services Terms</a></li>
<li><a href="/terms/websites">Website Subscription Terms</a></li>
<li><a href="/terms/wholesale">Wholesale Terms</a></li>
<li><a href="/terms/marketplace">Marketplace Terms</a></li>
<li><a href="/terms/addons">Website & Account Add-on Terms</a></li>
</ul>`;

  try {
    // Mark current general terms as not current
    await db.query(
      "UPDATE terms_versions SET is_current = 0 WHERE subscription_type = 'general' AND is_current = 1"
    );
    console.log('✓ Marked previous general terms as not current');

    // Insert new version
    const [result] = await db.query(
      `INSERT INTO terms_versions (version, title, subscription_type, content, is_current, created_at) 
       VALUES (?, ?, ?, ?, 1, NOW())`,
      ['3.0', 'Brakebee Terms of Use', 'general', content]
    );
    console.log('✓ Inserted new general terms v3.0 (ID: ' + result.insertId + ')');

    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error updating terms:', error);
    await db.end();
    process.exit(1);
  }
}

updateTerms();

