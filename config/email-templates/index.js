/**
 * Email Template Config Loader
 * Loads system default email templates from config files
 */

const fs = require('fs');
const path = require('path');

class EmailTemplateConfig {
  constructor() {
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load all template config files
   */
  loadTemplates() {
    const templatesDir = __dirname;
    const files = fs.readdirSync(templatesDir);

    files.forEach(file => {
      // Skip index.js and non-js files
      if (file === 'index.js' || !file.endsWith('.js')) {
        return;
      }

      try {
        const templatePath = path.join(templatesDir, file);
        const template = require(templatePath);
        
        if (template.template_key) {
          this.templates.set(template.template_key, template);
        }
      } catch (error) {
        console.error(`Error loading email template ${file}:`, error);
      }
    });

    console.log(`Loaded ${this.templates.size} email template configs`);
  }

  /**
   * Get template config by key
   * @param {string} templateKey - Template identifier
   * @returns {Object|null} Template config or null
   */
  getTemplate(templateKey) {
    return this.templates.get(templateKey) || null;
  }

  /**
   * Get all template configs
   * @returns {Array} Array of all template configs
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Check if template exists in config
   * @param {string} templateKey - Template identifier
   * @returns {boolean}
   */
  hasTemplate(templateKey) {
    return this.templates.has(templateKey);
  }

  /**
   * Reload templates from disk (useful for development)
   */
  reload() {
    this.templates.clear();
    // Clear require cache for template files
    const templatesDir = __dirname;
    const files = fs.readdirSync(templatesDir);
    
    files.forEach(file => {
      if (file !== 'index.js' && file.endsWith('.js')) {
        const templatePath = path.join(templatesDir, file);
        delete require.cache[require.resolve(templatePath)];
      }
    });
    
    this.loadTemplates();
  }
}

// Export singleton instance
module.exports = new EmailTemplateConfig();
