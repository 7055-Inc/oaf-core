/**
 * Base Layout Component for Luca Platform
 * Combines header, footer, and content area
 * Self-contained and mergeable into main app
 */

const { createHeader } = require('./header');
const { createFooter } = require('./footer');

function createLayout(options = {}) {
  const {
    title = 'Luca - Product Costing Platform',
    currentPath = '/',
    content = '',
    additionalCSS = '',
    additionalJS = ''
  } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" href="/static/css/styles.css">
        <link rel="icon" type="image/png" href="/static/images/luca.png">
        ${additionalCSS}
    </head>
    <body>
        ${createHeader(currentPath)}
        
        <main class="main-content">
            ${content}
        </main>

        ${createFooter()}

        <script src="/static/js/app.js"></script>
        ${additionalJS}
    </body>
    </html>
  `;
}

module.exports = { createLayout };
