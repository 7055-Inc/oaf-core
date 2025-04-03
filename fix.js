const fs = require('fs');
const path = require('path');

// Read the app.js file
const appJsPath = path.join(__dirname, 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// Add the apiRoutes require at the top
if (!content.includes("require('./routes/api')")) {
  content = content.replace(
    "const path = require('path');",
    "const path = require('path');\n// Import API routes\nconst apiRoutes = require('./routes/api');"
  );
}

// Add the app.use for API routes before app.listen
if (!content.includes("app.use('/api', apiRoutes)")) {
  content = content.replace(
    "app.get('*', (req, res) => {\n  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));\n});",
    "app.get('*', (req, res) => {\n  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));\n});\n\n// Use API routes\napp.use('/api', apiRoutes);"
  );
}

// Write the modified content back to app.js
fs.writeFileSync(appJsPath, content, 'utf8');

console.log('Successfully updated app.js to use API routes!'); 