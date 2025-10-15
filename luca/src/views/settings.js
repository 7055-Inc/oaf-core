/**
 * Settings Page for Luca Platform
 * Includes team management and other platform settings
 */

const { createLayout } = require('../components/layout');

function createSettingsPage() {
  const content = `
    <div class="content-area">
        <div class="settings-content">
            <div class="page-header">
                <h1>⚙️ Settings</h1>
                <p class="subtitle">Configure your platform preferences and team collaboration</p>
            </div>
            
            <div class="settings-sections">
                <!-- Team Management Section -->
                <div class="settings-section">
                    <div class="section-header">
                        <h2>🤝 Team Management</h2>
                        <p>Collaborate on costing projects with your team</p>
                        <button class="btn btn-primary" onclick="showCreateTeamModal()">
                            <span>➕</span> Create Team
                        </button>
                    </div>
                    
                    <div id="loading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading teams...</p>
                    </div>
                    
                    <div id="error-message" class="alert alert-error" style="display: none;">
                        <span class="error-text"></span>
                        <button onclick="hideError()" class="close-btn">×</button>
                    </div>
                    
                    <div id="teams-container" style="display: none;">
                        <div class="teams-grid">
                            <!-- Owned Teams -->
                            <div class="teams-subsection">
                                <h3>My Teams</h3>
                                <div id="owned-teams" class="teams-list">
                                    <!-- Owned teams will be loaded here -->
                                </div>
                            </div>
                            
                            <!-- Member Teams -->
                            <div class="teams-subsection">
                                <h3>Shared With Me</h3>
                                <div id="member-teams" class="teams-list">
                                    <!-- Member teams will be loaded here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Platform Settings Section -->
                <div class="settings-section">
                    <div class="section-header">
                        <h2>🔧 Platform Settings</h2>
                        <p>Configure your Luca platform preferences</p>
                    </div>
                    
                    <div class="settings-grid">
                        <div class="setting-card">
                            <h4>🌍 Default Currency</h4>
                            <p>Set your preferred currency for cost calculations</p>
                            <select class="setting-input">
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="CAD">CAD (C$)</option>
                            </select>
                        </div>
                        
                        <div class="setting-card">
                            <h4>📏 Default Units</h4>
                            <p>Choose your preferred measurement system</p>
                            <select class="setting-input">
                                <option value="imperial">Imperial (inches, pounds)</option>
                                <option value="metric">Metric (cm, kg)</option>
                            </select>
                        </div>
                        
                        <div class="setting-card">
                            <h4>📊 Cost Precision</h4>
                            <p>Decimal places for cost calculations</p>
                            <select class="setting-input">
                                <option value="2">2 decimal places</option>
                                <option value="3">3 decimal places</option>
                                <option value="4">4 decimal places</option>
                            </select>
                        </div>
                        
                        <div class="setting-card">
                            <h4>🔔 Notifications</h4>
                            <p>Team invitation and update notifications</p>
                            <label class="checkbox-label">
                                <input type="checkbox" checked> Email notifications
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" checked> Team activity updates
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-actions">
                        <button class="btn btn-primary">Save Settings</button>
                        <button class="btn btn-secondary">Reset to Defaults</button>
                    </div>
                </div>
                
                <!-- Account Section -->
                <div class="settings-section">
                    <div class="section-header">
                        <h2>👤 Account</h2>
                        <p>Manage your account and data</p>
                    </div>
                    
                    <div class="settings-grid">
                        <div class="setting-card">
                            <h4>📤 Export Data</h4>
                            <p>Download your materials, products, and cost data</p>
                            <button class="btn btn-secondary">Export to CSV</button>
                        </div>
                        
                        <div class="setting-card">
                            <h4>📥 Import Data</h4>
                            <p>Import materials and products from spreadsheets</p>
                            <button class="btn btn-secondary">Import CSV</button>
                        </div>
                        
                        <div class="setting-card">
                            <h4>🔄 Backup & Sync</h4>
                            <p>Automatic backup to cloud storage</p>
                            <label class="checkbox-label">
                                <input type="checkbox"> Enable automatic backups
                            </label>
                        </div>
                        
                        <div class="setting-card danger-zone">
                            <h4>⚠️ Danger Zone</h4>
                            <p>Irreversible actions - use with caution</p>
                            <button class="btn btn-danger">Delete All Data</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Team Management Modals (same as before) -->
    <div id="create-team-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
            <div class="modal-header">
                <h3>Create New Team</h3>
                <button onclick="hideCreateTeamModal()" class="close-btn">×</button>
            </div>
            <form id="create-team-form">
                <div class="form-group">
                    <label for="team-name">Team Name *</label>
                    <input type="text" id="team-name" name="name" required 
                           placeholder="Enter team name" maxlength="100">
                </div>
                <div class="form-group">
                    <label for="team-description">Description</label>
                    <textarea id="team-description" name="description" 
                              placeholder="Optional team description" rows="3"></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="hideCreateTeamModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Team</button>
                </div>
            </form>
        </div>
    </div>
    
    <div id="add-member-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
            <div class="modal-header">
                <h3>Add Team Member</h3>
                <button onclick="hideAddMemberModal()" class="close-btn">×</button>
            </div>
            <form id="add-member-form">
                <input type="hidden" id="add-team-id">
                <div class="form-group">
                    <label for="member-user-id">User ID *</label>
                    <input type="number" id="member-user-id" name="targetUserId" required 
                           placeholder="Enter user ID (e.g. 1234)" min="1">
                    <small style="color: #666; font-size: 0.8rem;">
                        Enter the user ID from your main application
                    </small>
                </div>
                <div class="form-group">
                    <label for="member-role">Role</label>
                    <select id="member-role" name="role">
                        <option value="viewer">Viewer - Can view all data</option>
                        <option value="editor">Editor - Can edit materials and products</option>
                        <option value="admin">Admin - Full access except team deletion</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="hideAddMemberModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Member</button>
                </div>
            </form>
        </div>
    </div>
    
    <div id="team-details-modal" class="modal-overlay" style="display: none;">
        <div class="modal modal-large">
            <div class="modal-header">
                <h3 id="team-details-title">Team Details</h3>
                <button onclick="hideTeamDetailsModal()" class="close-btn">×</button>
            </div>
            <div id="team-details-content">
                <!-- Team details will be loaded here -->
            </div>
        </div>
    </div>
  `;

  const additionalCSS = `
    <style>
        .settings-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .page-header {
            margin-bottom: 3rem;
            text-align: center;
        }
        
        .page-header h1 {
            margin: 0 0 0.5rem 0;
            color: #333;
            font-size: 2.5rem;
        }
        
        .subtitle {
            color: #666;
            margin: 0;
            font-size: 1.1rem;
        }
        
        .settings-sections {
            display: flex;
            flex-direction: column;
            gap: 3rem;
        }
        
        .settings-section {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border: 1px solid #e0e0e0;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .section-header div {
            flex: 1;
        }
        
        .section-header h2 {
            margin: 0 0 0.5rem 0;
            color: #333;
            font-size: 1.8rem;
        }
        
        .section-header p {
            margin: 0;
            color: #666;
            font-size: 1rem;
        }
        
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .setting-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1.5rem;
        }
        
        .setting-card.danger-zone {
            background: #fff5f5;
            border-color: #fed7d7;
        }
        
        .setting-card h4 {
            margin: 0 0 0.5rem 0;
            color: #333;
            font-size: 1.1rem;
        }
        
        .setting-card p {
            margin: 0 0 1rem 0;
            color: #666;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .setting-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            background: white;
        }
        
        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
            color: #333;
            cursor: pointer;
        }
        
        .checkbox-label input[type="checkbox"] {
            margin: 0;
        }
        
        .settings-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            padding-top: 1rem;
            border-top: 1px solid #e0e0e0;
        }
        
        /* Team Management Styles (adapted for settings page) */
        .teams-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }
        
        @media (max-width: 768px) {
            .teams-grid {
                grid-template-columns: 1fr;
            }
            .section-header {
                flex-direction: column;
                gap: 1rem;
                align-items: stretch;
            }
        }
        
        .teams-subsection h3 {
            color: #555;
            margin-bottom: 1rem;
            font-size: 1.2rem;
        }
        
        .loading-state {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .alert {
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            position: relative;
        }
        
        .alert-error {
            background-color: #fee;
            border: 1px solid #fcc;
            color: #c33;
        }
        
        .close-btn {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: inherit;
        }
        
        .team-card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .team-card:hover {
            border-color: #007bff;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }
        
        .team-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .team-card-header h4 {
            margin: 0;
            color: #333;
            font-size: 1.1rem;
        }
        
        .role-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .role-badge.owner { background-color: #28a745; color: white; }
        .role-badge.admin { background-color: #007bff; color: white; }
        .role-badge.editor { background-color: #ffc107; color: #333; }
        .role-badge.viewer { background-color: #6c757d; color: white; }
        
        .team-description {
            color: #666;
            margin: 0.5rem 0;
            font-size: 0.85rem;
            line-height: 1.4;
        }
        
        .team-stats {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: #888;
            margin-top: 1rem;
        }
        
        .team-actions {
            margin-top: 1rem;
            display: flex;
            gap: 0.5rem;
        }
        
        .empty-state {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 2rem;
            background: #f8f9fa;
            border-radius: 8px;
            border: 2px dashed #dee2e6;
        }
        
        /* Button Styles */
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary { background-color: #007bff; color: white; }
        .btn-primary:hover:not(:disabled) { background-color: #0056b3; }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-secondary:hover:not(:disabled) { background-color: #545b62; }
        .btn-danger { background-color: #dc3545; color: white; }
        .btn-danger:hover:not(:disabled) { background-color: #c82333; }
        .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
        
        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .modal {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        .modal-large { max-width: 800px; }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #eee;
        }
        
        .modal-header h3 { margin: 0; color: #333; }
        
        .form-group {
            margin-bottom: 1.5rem;
            padding: 0 1.5rem;
        }
        
        .form-group:first-child { padding-top: 1.5rem; }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
            color: #333;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        
        .modal-actions {
            padding: 1.5rem;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }
    </style>
  `;

  const additionalJS = `
    <script src="/static/js/teams.js"></script>
  `;

  return createLayout({
    title: 'Settings - Luca Platform',
    currentPath: '/settings',
    content,
    additionalCSS,
    additionalJS
  });
}

module.exports = { createSettingsPage };
