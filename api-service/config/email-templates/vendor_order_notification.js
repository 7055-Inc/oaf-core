module.exports = {
  template_key: 'vendor_order_notification',
  name: 'Vendor Order Notification',
  subject_template: 'New Order Received - #{order_number}',
  body_template: `You have received a new order #{order_number}...`,
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default'
};
