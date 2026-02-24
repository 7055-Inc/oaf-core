module.exports = {
  template_key: 'new_product',
  name: 'New Product Notification',
  subject_template: 'New Artwork Added! 🎉',
  body_template:
    '<div style="text-align: center;">\n' +
    '  <img src="#{product_image_url}" alt="#{product_name}" style="max-width: 300px; height: auto; display: block; margin: 0 auto 20px auto;">\n' +
    '  <h1 style="margin: 20px 0; color: #333333;"><a href="#{product_url}" style="color: #055474; text-decoration: none;">#{product_name}</a></h1>\n' +
    '  <hr style="width: 25%; border: 0; height: 2px; background-color: #3e1c56; margin: 20px auto;">\n' +
    '  #{product_variations}\n' +
    '  <div style="text-align: left; margin: 20px 0;">#{product_description}</div>\n' +
    '  <div style="text-align: left; margin: 20px 0;"><h3 style="display: inline-block; border: 2px solid #3e1c56; padding: 10px 15px; margin: 0; color: #333333;">#{product_price}</h3></div>\n' +
    '  <hr style="width: 25%; border: 0; height: 2px; background-color: #3e1c56; margin: 20px auto;">\n' +
    '  <div style="margin: 30px 0;"><a href="#{product_url}" style="background-color: #055474; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Product</a></div>\n' +
    '</div>',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default'
};
