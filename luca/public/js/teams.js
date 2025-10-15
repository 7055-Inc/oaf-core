/**
 * Team Management JavaScript for Luca Platform
 * Handles team creation, invitations, and member management
 */

// Global state
let currentTeams = { owned_teams: [], member_teams: [] };
let authToken = null; // Will be set from main app or localStorage

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤝 Team management loaded');
    
    // Try to get auth token from localStorage or main app
    authToken = localStorage.getItem('token') || window.authToken;
    
    if (authToken) {
        loadTeams();
    } else {
        showError('Authentication required. Please sign in to manage teams.');
    }
});

// API helper function
async function apiCall(endpoint, options = {}) {
    const config = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...options
    };

    try {
        const response = await fetch(`/api${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Load user's teams
async function loadTeams() {
    try {
        showLoading();
        const data = await apiCall('/teams/my-teams');
        currentTeams = data.data;
        renderTeams();
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(`Failed to load teams: ${error.message}`);
    }
}

// Render teams in the UI
function renderTeams() {
    const ownedContainer = document.getElementById('owned-teams');
    const memberContainer = document.getElementById('member-teams');
    
    // Render owned teams
    if (currentTeams.owned_teams.length === 0) {
        ownedContainer.innerHTML = '<p class="empty-state">No teams created yet. Create your first team to get started!</p>';
    } else {
        ownedContainer.innerHTML = currentTeams.owned_teams.map(team => createTeamCard(team, true)).join('');
    }
    
    // Render member teams
    if (currentTeams.member_teams.length === 0) {
        memberContainer.innerHTML = '<p class="empty-state">No shared teams yet. Ask a team owner to invite you!</p>';
    } else {
        memberContainer.innerHTML = currentTeams.member_teams.map(team => createTeamCard(team, false)).join('');
    }
    
    document.getElementById('teams-container').style.display = 'block';
}

// Create team card HTML
function createTeamCard(team, isOwner) {
    const roleText = isOwner ? 'Owner' : team.user_role;
    const roleClass = isOwner ? 'owner' : team.user_role;
    
    return `
        <div class="team-card" onclick="showTeamDetails(${team.id})">
            <div class="team-card-header">
                <h4>${escapeHtml(team.name)}</h4>
                <span class="role-badge ${roleClass}">${roleText}</span>
            </div>
            <p class="team-description">${escapeHtml(team.description || 'No description')}</p>
            <div class="team-stats">
                <span>${team.member_count} members</span>
                <span>Created ${new Date(team.created_at).toLocaleDateString()}</span>
            </div>
            ${isOwner ? `
                <div class="team-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-secondary" onclick="showAddMemberModal(${team.id})">
                        Add Member
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Show/hide loading state
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('teams-container').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show/hide error messages
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.querySelector('.error-text').textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('error-message').style.display = 'none';
}

// Create team modal functions
function showCreateTeamModal() {
    document.getElementById('create-team-modal').style.display = 'flex';
    document.getElementById('team-name').focus();
}

function hideCreateTeamModal() {
    document.getElementById('create-team-modal').style.display = 'none';
    document.getElementById('create-team-form').reset();
}

// Handle create team form submission
document.getElementById('create-team-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const teamData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim()
    };
    
    if (!teamData.name) {
        showError('Team name is required');
        return;
    }
    
    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        await apiCall('/teams/create', {
            method: 'POST',
            body: JSON.stringify(teamData)
        });
        
        hideCreateTeamModal();
        loadTeams(); // Refresh teams list
        
        // Show success message
        showError('Team created successfully!');
        setTimeout(hideError, 3000);
        
    } catch (error) {
        showError(`Failed to create team: ${error.message}`);
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Team';
    }
});

// Add member modal functions
function showAddMemberModal(teamId) {
    document.getElementById('add-team-id').value = teamId;
    document.getElementById('add-member-modal').style.display = 'flex';
    document.getElementById('member-user-id').focus();
}

function hideAddMemberModal() {
    document.getElementById('add-member-modal').style.display = 'none';
    document.getElementById('add-member-form').reset();
}

// Handle add member form submission
document.getElementById('add-member-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const teamId = formData.get('team-id') || document.getElementById('add-team-id').value;
    const memberData = {
        targetUserId: parseInt(formData.get('targetUserId')),
        role: formData.get('role')
    };
    
    if (!memberData.targetUserId || memberData.targetUserId < 1) {
        showError('Valid user ID is required');
        return;
    }
    
    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        
        const result = await apiCall(`/teams/${teamId}/add-member`, {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
        
        hideAddMemberModal();
        
        // Show success message
        showError(`User ${memberData.targetUserId} added to team successfully!`);
        setTimeout(() => {
            hideError();
            loadTeams(); // Refresh teams list
        }, 3000);
        
    } catch (error) {
        showError(`Failed to add member: ${error.message}`);
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Member';
    }
});

// Team details modal functions
async function showTeamDetails(teamId) {
    try {
        document.getElementById('team-details-modal').style.display = 'flex';
        document.getElementById('team-details-content').innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading team details...</p></div>';
        
        const data = await apiCall(`/teams/${teamId}`);
        renderTeamDetails(data.data);
        
    } catch (error) {
        document.getElementById('team-details-content').innerHTML = `<div class="alert alert-error">Failed to load team details: ${error.message}</div>`;
    }
}

function hideTeamDetailsModal() {
    document.getElementById('team-details-modal').style.display = 'none';
}

// Render team details
function renderTeamDetails(teamData) {
    const { team, members, invitations } = teamData;
    const canManage = team.user_role === 'owner' || team.user_role === 'admin';
    
    document.getElementById('team-details-title').textContent = team.name;
    
    const content = `
        <div style="padding: 1.5rem;">
            <p style="color: #666; margin-bottom: 2rem;">${escapeHtml(team.description || 'No description provided')}</p>
            
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: #333;">Members (${members.length})</h4>
                    ${canManage ? `<button class="btn btn-sm btn-primary" onclick="showAddMemberModal(${team.id})">Add Member</button>` : ''}
                </div>
                
                <div style="border: 1px solid #eee; border-radius: 4px;">
                    ${members.map((member, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; ${index < members.length - 1 ? 'border-bottom: 1px solid #eee;' : ''}">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="font-weight: bold; color: #333;">User #${member.user_id}</span>
                                <span class="role-badge ${member.role}">${member.role}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="font-size: 0.8rem; color: #666;">Joined ${new Date(member.joined_at).toLocaleDateString()}</span>
                                ${canManage && member.role !== 'owner' ? `
                                    <button class="btn btn-sm" style="background-color: #dc3545; color: white;" onclick="removeMember(${team.id}, ${member.user_id})">
                                        Remove
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${invitations && invitations.length > 0 ? `
                <div>
                    <h4 style="margin: 0 0 1rem 0; color: #333;">Pending Invitations (${invitations.length})</h4>
                    <div style="border: 1px solid #eee; border-radius: 4px;">
                        ${invitations.map((invitation, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; ${index < invitations.length - 1 ? 'border-bottom: 1px solid #eee;' : ''}">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span>${escapeHtml(invitation.email)}</span>
                                    <span class="role-badge ${invitation.role}">${invitation.role}</span>
                                </div>
                                <span style="font-size: 0.8rem; color: #666;">
                                    Expires ${new Date(invitation.expires_at).toLocaleDateString()}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('team-details-content').innerHTML = content;
}

// Remove team member
async function removeMember(teamId, memberId) {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
        return;
    }
    
    try {
        await apiCall(`/teams/${teamId}/members/${memberId}`, {
            method: 'DELETE'
        });
        
        // Refresh team details
        showTeamDetails(teamId);
        
        // Refresh teams list
        loadTeams();
        
    } catch (error) {
        showError(`Failed to remove member: ${error.message}`);
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Note: Email invitation system removed - users are now added directly by team owners/admins
