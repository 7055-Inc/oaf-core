module.exports = {
  template_key: 'product_low_stock',
  name: 'Product Low Stock Alert',
  subject_template: 'Low Stock Alert: #{product_name}',
  body_template:
    '<h1>Low Stock Alert</h1>\n' +
    '<p>This is a notification that the following product is running low on inventory:</p>\n' +
    '<h2>#{product_name}</h2>\n' +
    '<p><strong>Current Stock:</strong> #{current_stock} units</p>\n' +
    '<p><strong>Reorder Level:</strong> #{reorder_level} units</p>\n' +
    '<p><strong>Vendor:</strong> #{vendor_name}</p>\n' +
    '<p><a href="#{product_admin_url}" style="background-color: #055474; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Product</a></p>',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};
