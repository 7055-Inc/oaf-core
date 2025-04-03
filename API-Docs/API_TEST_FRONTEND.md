# API Test Frontend Implementation

This document outlines the implementation of a simple frontend interface to test the API Gateway setup. The test frontend will allow you to verify that the entire communication flow between frontend, application server, and database server is working correctly.

## Directory Structure

Create the following files in `/var/www/api-test/`:

```
/var/www/api-test/
├── index.html
├── styles.css
├── script.js
└── favicon.ico (optional)
```

## HTML Implementation

Create `index.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Gateway Test Interface</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>API Gateway Test Interface</h1>
            <p class="subtitle">Test the communication between frontend, application server, and database server</p>
        </header>
        
        <main>
            <section class="card">
                <h2>API Test Status</h2>
            <div class="status-container">
                    <div id="status-indicator" class="status-indicator">
                        <div class="spinner"></div>
                    </div>
                    <div class="status-details">
                        <p><strong>Status:</strong> <span id="active-status">Loading...</span></p>
                        <p><strong>Message:</strong> <span id="status-message">Fetching data...</span></p>
                        <p><strong>Last Updated:</strong> <span id="last-updated">-</span></p>
                    </div>
                </div>
                <div class="actions">
                    <button id="refresh-btn" class="btn primary">Refresh Status</button>
                    <button id="toggle-btn" class="btn secondary" disabled>Toggle Status</button>
            </div>
            </section>

            <section class="card">
                <h2>API Response</h2>
                <div class="response-container">
                    <pre id="response-data">Waiting for API response...</pre>
            </div>
                <div class="metrics">
                    <div class="metric">
                        <span class="metric-label">Response Time</span>
                        <span id="response-time" class="metric-value">-</span>
            </div>
                    <div class="metric">
                        <span class="metric-label">Request Count</span>
                        <span id="request-count" class="metric-value">0</span>
            </div>
        </div>
            </section>
        </main>

        <footer>
            <p>API Gateway Implementation Test &copy; 2023</p>
        </footer>
        </div>
    
    <div id="toast" class="toast hidden">
        <span id="toast-message"></span>
    </div>
    
    <script src="script.js"></script>
</body>
</html>
```

## CSS Implementation

Create `styles.css` with the following content:

```css
:root {
    --primary-color: #4361ee;
    --primary-dark: #3a56d4;
    --secondary-color: #f72585;
    --secondary-dark: #d91c77;
    --success-color: #06d6a0;
    --error-color: #ef476f;
    --warning-color: #ffd166;
    --background-color: #f8f9fa;
    --card-background: #ffffff;
    --text-color: #212529;
    --text-light: #6c757d;
    --border-color: #dee2e6;
    --border-radius: 8px;
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    --transition: all 0.3s ease;
            }
            
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

header {
    text-align: center;
    margin-bottom: 2rem;
}

h1 {
    margin-bottom: 0.5rem;
    color: var(--primary-color);
}

.subtitle {
    color: var(--text-light);
}

.card {
    background-color: var(--card-background);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    margin-bottom: 2rem;
}

h2 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
    color: var(--text-color);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
}

.status-container {
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
}

.status-indicator {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1.5rem;
    background-color: var(--border-color);
}

.status-active {
    background-color: var(--success-color);
}

.status-inactive {
    background-color: var(--error-color);
}

.spinner {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top: 4px solid var(--primary-color);
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.status-details {
    flex: 1;
}

.status-details p {
    margin-bottom: 0.5rem;
}

.actions {
    display: flex;
    gap: 1rem;
}

.btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: var(--transition);
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.primary {
    background-color: var(--primary-color);
    color: white;
}

.primary:hover:not(:disabled) {
    background-color: var(--primary-dark);
}

.secondary {
    background-color: var(--secondary-color);
    color: white;
}

.secondary:hover:not(:disabled) {
    background-color: var(--secondary-dark);
}

.response-container {
    background-color: #f8f9fa;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
    overflow-x: auto;
}

pre {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
}

.metrics {
    display: flex;
    gap: 2rem;
}

.metric {
    display: flex;
    flex-direction: column;
}

.metric-label {
    font-size: 0.75rem;
    color: var(--text-light);
    margin-bottom: 0.25rem;
}

.metric-value {
    font-weight: 600;
}

footer {
    text-align: center;
    margin-top: 2rem;
    color: var(--text-light);
    font-size: 0.875rem;
}

.toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--text-color);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    z-index: 1000;
    transition: var(--transition);
}

.toast.hidden {
    opacity: 0;
    visibility: hidden;
}

.toast.error {
    background-color: var(--error-color);
}

.toast.success {
    background-color: var(--success-color);
}

@media (max-width: 600px) {
    .status-container {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .status-indicator {
        margin-bottom: 1rem;
        margin-right: 0;
    }
    
    .actions {
        flex-direction: column;
    }
    
    .metrics {
        flex-direction: column;
        gap: 0.5rem;
}
}
```

## JavaScript Implementation

Create `script.js` with the following content:

```javascript
// Configuration
const API_URL = '/api/v1/test';
let requestCount = 0;

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const activeStatus = document.getElementById('active-status');
const statusMessage = document.getElementById('status-message');
const lastUpdated = document.getElementById('last-updated');
const responseData = document.getElementById('response-data');
const responseTime = document.getElementById('response-time');
const requestCountElem = document.getElementById('request-count');
const refreshBtn = document.getElementById('refresh-btn');
const toggleBtn = document.getElementById('toggle-btn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Event Listeners
refreshBtn.addEventListener('click', fetchStatus);
toggleBtn.addEventListener('click', toggleStatus);

// Functions
function showToast(message, type = 'default') {
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function updateUI(data, responseTimeMs) {
    // Remove spinner
    statusIndicator.innerHTML = '';
    
    // Update status indicator
    if (data.is_active) {
        statusIndicator.classList.add('status-active');
        statusIndicator.classList.remove('status-inactive');
        activeStatus.textContent = 'Active';
    } else {
        statusIndicator.classList.add('status-inactive');
        statusIndicator.classList.remove('status-active');
        activeStatus.textContent = 'Inactive';
}

    // Update other UI elements
    statusMessage.textContent = data.message || 'No message';
    lastUpdated.textContent = formatTimestamp(data.updated_at);
    responseTime.textContent = `${responseTimeMs}ms`;
    requestCountElem.textContent = requestCount.toString();
    
    // Enable toggle button
    toggleBtn.disabled = false;
}

async function fetchStatus() {
    try {
        // Reset UI for loading state
        statusIndicator.innerHTML = '<div class="spinner"></div>';
        statusIndicator.classList.remove('status-active', 'status-inactive');
        activeStatus.textContent = 'Loading...';
        statusMessage.textContent = 'Fetching data...';
        toggleBtn.disabled = true;
        
        // Record start time for response time calculation
        const startTime = performance.now();
        
        // Fetch data from API
        const response = await fetch(API_URL);
        const responseBody = await response.json();
        
        // Calculate response time
        const endTime = performance.now();
        const responseTimeMs = Math.round(endTime - startTime);
        
        // Update request count
        requestCount++;
        
        // Format and display response data
        responseData.textContent = JSON.stringify(responseBody, null, 2);
        
        if (responseBody.success && responseBody.data) {
            updateUI(responseBody.data, responseTimeMs);
        } else {
            throw new Error(responseBody.error?.message || 'Failed to fetch status');
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        statusIndicator.innerHTML = '❌';
        activeStatus.textContent = 'Error';
        statusMessage.textContent = error.message;
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function toggleStatus() {
    try {
        // Disable buttons to prevent multiple requests
        toggleBtn.disabled = true;
        refreshBtn.disabled = true;
        
        // Get current status
        const currentStatusText = activeStatus.textContent;
        const newStatus = currentStatusText !== 'Active';
        
        // Show loading state
        statusIndicator.innerHTML = '<div class="spinner"></div>';
        statusMessage.textContent = 'Updating status...';
        
        // Record start time for response time calculation
        const startTime = performance.now();
        
        // Send update request
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_active: newStatus
            })
        });
        
        const responseBody = await response.json();
        
        // Calculate response time
        const endTime = performance.now();
        const responseTimeMs = Math.round(endTime - startTime);
        
        // Update request count
        requestCount++;
        
        // Format and display response data
        responseData.textContent = JSON.stringify(responseBody, null, 2);
        
        if (responseBody.success) {
            // Fetch fresh status after successful update
            fetchStatus();
            showToast(`Status successfully updated to ${newStatus ? 'Active' : 'Inactive'}`, 'success');
        } else {
            throw new Error(responseBody.error?.message || 'Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast(`Error: ${error.message}`, 'error');
        statusIndicator.innerHTML = '❌';
        statusMessage.textContent = error.message;
    } finally {
        // Re-enable buttons
        refreshBtn.disabled = false;
    }
}

// Initialize: fetch status on page load
document.addEventListener('DOMContentLoaded', fetchStatus);
```

## Usage Instructions

1. Place all files in the `/var/www/api-test/` directory.

2. Ensure the Nginx configuration is properly set up to serve the test frontend from `/api-test/` path.

3. Access the test frontend at https://your-api-domain.com/api-test/

## Testing Flow

1. When the page loads, it automatically fetches the current status from the API.

2. The status indicator will show:
   - Green circle for "Active" status
   - Red circle for "Inactive" status
   - Loading spinner while fetching data
   - Error indicator if the request fails

3. The "Toggle Status" button allows you to change the active state between active and inactive.

4. The "Refresh Status" button fetches the current state from the API.

5. The response area shows the raw JSON response from the API.

6. The metrics section displays:
   - Response time in milliseconds
   - Number of requests made in the current session

## Troubleshooting

If the test frontend doesn't work as expected:

1. Check the browser console for JavaScript errors.

2. Verify that the API URL in `script.js` matches your API endpoint path.

3. Ensure the Nginx configuration has proper CORS headers if your frontend is hosted on a different domain.

4. Verify network requests in the browser developer tools to check for any API connection issues.

## Security Considerations

For a production environment, consider implementing:

1. Authentication for the test page
2. Rate limiting to prevent abuse
3. HTTPS to encrypt all communications
4. Input validation for all API requests
5. Proper error handling that doesn't expose sensitive information 