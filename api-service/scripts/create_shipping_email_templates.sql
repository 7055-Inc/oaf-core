-- Shipping Email Templates for Vendor Shipping System
-- Creates templates for order shipped and delivered notifications

INSERT INTO email_templates (template_key, name, priority_level, can_compile, is_transactional, subject_template, body_template) VALUES 
('order_shipped', 'Order Shipped Notification', 1, 0, 1, 'Your Order #{order_number} Has Shipped! 📦', '
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <h1 style="color: #055474; font-family: Permanent Marker, cursive; font-size: 28px; margin: 0 0 20px 0;">
        Great News! Your Order Has Shipped! 📦
      </h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 20px 20px 20px;">
      <p style="font-family: Montserrat, sans-serif; font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
        Hi #{customer_name},
      </p>
      <p style="font-family: Montserrat, sans-serif; font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
        Exciting news! Your order <strong>#{order_number}</strong> from #{vendor_name} has been shipped and is on its way to you!
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 20px 20px 20px;">
      <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
        <tr>
          <td>
            <h3 style="color: #055474; font-family: Permanent Marker, cursive; font-size: 18px; margin: 0 0 15px 0;">
              📋 Order Details
            </h3>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Order Number:</strong> #{order_number}
            </p>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Items:</strong> #{product_list}
            </p>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Vendor:</strong> #{vendor_name}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 20px 20px 20px;">
      <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background: #e8f5e8; border-radius: 8px; border: 1px solid #28a745;">
        <tr>
          <td>
            <h3 style="color: #28a745; font-family: Permanent Marker, cursive; font-size: 18px; margin: 0 0 15px 0;">
              🚚 Tracking Information
            </h3>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Carrier:</strong> #{carrier_name}
            </p>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Tracking Number:</strong> #{tracking_number}
            </p>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Estimated Delivery:</strong> #{estimated_delivery}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 30px 20px;">
      <a href="#{tracking_url}" style="background: linear-gradient(135deg, #055474 0%, #3E1C56 50%, #055474 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 2px; font-family: Montserrat, sans-serif; font-weight: bold; font-size: 16px; display: inline-block;">
        📍 Track Your Package
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 20px 20px 20px;">
      <p style="font-family: Montserrat, sans-serif; font-size: 14px; line-height: 1.6; color: #666; margin: 0;">
        We will send you another email when your package is delivered. If you have any questions about your order, please contact #{vendor_name} directly or reach out to our support team.
      </p>
    </td>
  </tr>
</table>
'),
('order_delivered', 'Order Delivered Notification', 2, 0, 1, 'Your Order #{order_number} Has Been Delivered! ✅', '
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <h1 style="color: #28a745; font-family: Permanent Marker, cursive; font-size: 28px; margin: 0 0 20px 0;">
        Your Order Has Been Delivered! ✅
      </h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 20px 20px 20px;">
      <p style="font-family: Montserrat, sans-serif; font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
        Hi #{customer_name},
      </p>
      <p style="font-family: Montserrat, sans-serif; font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
        Great news! Your order <strong>#{order_number}</strong> from #{vendor_name} has been successfully delivered!
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 20px 20px 20px;">
      <table width="100%" cellpadding="15" cellspacing="0" border="0" style="background: #e8f5e8; border-radius: 8px; border: 1px solid #28a745;">
        <tr>
          <td>
            <h3 style="color: #28a745; font-family: Permanent Marker, cursive; font-size: 18px; margin: 0 0 15px 0;">
              📦 Delivery Confirmed
            </h3>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Delivered On:</strong> #{delivery_date}
            </p>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Tracking Number:</strong> #{tracking_number}
            </p>
            <p style="font-family: Montserrat, sans-serif; font-size: 14px; margin: 5px 0; color: #333;">
              <strong>Items Delivered:</strong> #{product_list}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding: 30px 20px;">
      <p style="font-family: Montserrat, sans-serif; font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 20px 0;">
        We hope you love your new items from #{vendor_name}!
      </p>
      <a href="#{feedback_url}" style="background: linear-gradient(135deg, #055474 0%, #3E1C56 50%, #055474 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 2px; font-family: Montserrat, sans-serif; font-weight: bold; font-size: 16px; display: inline-block;">
        ⭐ Rate Your Experience
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 20px 20px 20px;">
      <p style="font-family: Montserrat, sans-serif; font-size: 14px; line-height: 1.6; color: #666; margin: 0;">
        Thank you for shopping with us! If you have any issues with your order, please contact #{vendor_name} or our support team within 30 days of delivery.
      </p>
    </td>
  </tr>
</table>
');