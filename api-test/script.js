// Configuration
const API_URL = '/v1/test';
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