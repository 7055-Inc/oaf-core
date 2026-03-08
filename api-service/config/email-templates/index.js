/**
 * Email Template Config Loader
 * 
 * Auto-loads all template files from this directory.
 * Each file exports a template object with template_key as the identifier.
 * Config templates take priority over database templates.
 */

const fs = require('fs');
const path = require('path');

const templates = {};

fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const template = require(path.join(__dirname, file));
    if (template.template_key) {
      templates[template.template_key] = template;
    }
  });

module.exports = {
  getTemplate(key) {
    return templates[key] || null;
  },

  getAllTemplates() {
    return { ...templates };
  }
};
