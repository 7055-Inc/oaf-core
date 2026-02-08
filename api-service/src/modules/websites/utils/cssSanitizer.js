const postcss = require('postcss');
const safeParser = require('postcss-safe-parser');

/**
 * Sanitize user-provided CSS to prevent XSS attacks
 * Removes dangerous properties and values that could execute JavaScript
 * 
 * @param {string} cssString - Raw CSS string from user input
 * @returns {Promise<string>} Sanitized CSS string safe for storage and rendering
 * @throws {Error} If CSS syntax is invalid or cannot be parsed
 */
async function sanitizeCSS(cssString) {
  if (!cssString || typeof cssString !== 'string') {
    return '';
  }

  // Properties that can execute scripts or load external resources maliciously
  const dangerousProps = [
    'behavior',
    '-moz-binding',
    'expression',
    '@import',
    '@font-face' // Allow later with URL whitelist if needed
  ];

  // Value patterns that can execute JavaScript
  const dangerousValues = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /-moz-binding/i,
    /expression\(/i
  ];

  try {
    const result = await postcss([
      (root) => {
        root.walkRules((rule) => {
          // Remove @import rules
          if (rule.name === 'import') {
            rule.remove();
            return;
          }
        });

        root.walkDecls((decl) => {
          // Remove dangerous properties
          if (dangerousProps.some(prop => 
            decl.prop.toLowerCase().includes(prop.toLowerCase())
          )) {
            decl.remove();
            return;
          }

          // Remove dangerous values
          if (dangerousValues.some(regex => regex.test(decl.value))) {
            decl.remove();
            return;
          }
        });

        root.walkAtRules((rule) => {
          // Remove @import and @font-face
          if (['import', 'font-face'].includes(rule.name.toLowerCase())) {
            rule.remove();
          }
        });
      }
    ]).process(cssString, { 
      parser: safeParser,
      from: undefined 
    });

    return result.css;
  } catch (error) {
    console.error('CSS sanitization error:', error);
    throw new Error('Invalid CSS syntax');
  }
}

module.exports = { sanitizeCSS };
