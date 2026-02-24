module.exports = {
  template_key: 'order_shipped',
  name: 'Order Shipped Notification',
  subject_template: 'Your #{product_name} from #{vendor_name} has shipped',
  body_template: `<h2>Great news! Your item has shipped</h2>
<p>Hi #{customer_name},</p>
<p>Your <strong>#{product_name}</strong> from <strong>#{vendor_name}</strong> has been shipped and is on its way to you.</p>
<h3>Shipping Details:</h3>
<ul>
<li><strong>Carrier:</strong> #{carrier_name}</li>
<li><strong>Tracking Number:</strong> #{tracking_number}</li>
<li><strong>Estimated Delivery:</strong> #{estimated_delivery}</li>
</ul>
<p><a href="#{tracking_url}" style="background-color: #055474; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Package</a></p>
<p>Questions about your order? Contact #{vendor_name} directly or reach out to our support team.</p>
<p>Thanks for shopping with us.</p>`,
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};
