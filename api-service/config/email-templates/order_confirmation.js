module.exports = {
  template_key: 'order_confirmation',
  name: 'Customer Order Confirmation',
  subject_template: 'Order Confirmation - Order ##{order_number}',
  body_template: `<h1 style="color: #333;">Thank you for your order!</h1>

<p>Hi #{buyer_name},</p>

<p>Your order <strong>##{order_number}</strong> has been confirmed and is being processed.</p>

<p><strong>Order Date:</strong> #{order_date}</p>

<h2 style="color: #333; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">Order Details</h2>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <thead>
    <tr style="background-color: #f8f9fa;">
      <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
      <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
      <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
      <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
    </tr>
  </thead>
  <tbody>
    #{invoice_items_html}
  </tbody>
</table>

<table style="width: 100%; max-width: 400px; margin-left: auto; margin-top: 20px;">
  <tr>
    <td style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
    <td style="padding: 8px; text-align: right;">$#{subtotal}</td>
  </tr>
  <tr>
    <td style="padding: 8px; text-align: right;"><strong>Shipping:</strong></td>
    <td style="padding: 8px; text-align: right;">$#{shipping_amount}</td>
  </tr>
  <tr>
    <td style="padding: 8px; text-align: right;"><strong>Tax:</strong></td>
    <td style="padding: 8px; text-align: right;">$#{tax_amount}</td>
  </tr>
  <tr style="border-top: 2px solid #2c5aa0;">
    <td style="padding: 12px; text-align: right; font-size: 18px;"><strong>Total:</strong></td>
    <td style="padding: 12px; text-align: right; font-size: 18px; color: #2c5aa0;"><strong>$#{total_amount}</strong></td>
  </tr>
</table>

<div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
  <p><strong>What happens next?</strong></p>
  <ul>
    <li>Your order is being prepared for shipment</li>
    <li>You should receive a shipping confirmation email with tracking information</li>
    <li>Track your order anytime in your <a href="#{order_url}" style="color: #2c5aa0;">dashboard</a></li>
  </ul>
</div>

<p style="margin-top: 30px;">Questions? Contact us at <a href="mailto:#{support_email}" style="color: #2c5aa0;">#{support_email}</a></p>

<p style="color: #666; font-size: 14px; margin-top: 30px;">Thank you for shopping with Brakebee!</p>`,
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};
