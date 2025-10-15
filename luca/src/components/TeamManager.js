import React, { useState, useEffect } from 'react';
import './TeamManager.css';

/**
 * Team Management Component for Luca Platform
 * Allows users to create teams, invite members, and manage team access
 */

const TeamManager = ({ apiBaseUrl = '/api', authToken }) => {
  const [teams, setTeams] = useState({ owned_teams: [], member_teams: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // API helper
  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Load user's teams
  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/teams/my-teams');
      setTeams(data.data);
    } catch (err) {
      setError(`Failed to load teams: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create new team
  const createTeam = async (formData) => {
    try {
      const data = await apiCall('/teams/create', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      setShowCreateForm(false);
      loadTeams(); // Refresh teams list
      return data;
    } catch (err) {
      throw new Error(`Failed to create team: ${err.message}`);
    }
  };

  // Send team invitation
  const inviteUser = async (teamId, inviteData) => {
    try {
      const data = await apiCall(`/teams/${teamId}/invite`, {
        method: 'POST',
        body: JSON.stringify(inviteData)
      });
      
      setShowInviteForm(null);
      if (selectedTeam && selectedTeam.team.id === teamId) {
        loadTeamDetails(teamId); // Refresh team details
      }
      return data;
    } catch (err) {
      throw new Error(`Failed to send invitation: ${err.message}`);
    }
  };

  // Load team details
  const loadTeamDetails = async (teamId) => {
    try {
      const data = await apiCall(`/teams/${teamId}`);
      setSelectedTeam(data.data);
    } catch (err) {
      setError(`Failed to load team details: ${err.message}`);
    }
  };

  // Remove team member
  const removeMember = async (teamId, memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      await apiCall(`/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE'
      });
      
      loadTeamDetails(teamId); // Refresh team details
    } catch (err) {
      setError(`Failed to remove member: ${err.message}`);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadTeams();
    }
  }, [authToken]);

  if (loading) {
    return <div className="team-manager loading">Loading teams...</div>;
  }

  return (
    <div className="team-manager">
      <div className="team-manager-header">
        <h2>Team Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Create Team
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="teams-grid">
        {/* Owned Teams */}
        <div className="teams-section">
          <h3>My Teams ({teams.owned_teams.length})</h3>
          {teams.owned_teams.map(team => (
            <TeamCard 
              key={team.id} 
              team={team} 
              isOwner={true}
              onSelect={() => loadTeamDetails(team.id)}
              onInvite={() => setShowInviteForm(team.id)}
            />
          ))}
        </div>

        {/* Member Teams */}
        <div className="teams-section">
          <h3>Shared With Me ({teams.member_teams.length})</h3>
          {teams.member_teams.map(team => (
            <TeamCard 
              key={team.id} 
              team={team} 
              isOwner={false}
              onSelect={() => loadTeamDetails(team.id)}
            />
          ))}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateForm && (
        <CreateTeamModal 
          onSubmit={createTeam}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Invite User Modal */}
      {showInviteForm && (
        <InviteUserModal 
          teamId={showInviteForm}
          onSubmit={(data) => inviteUser(showInviteForm, data)}
          onClose={() => setShowInviteForm(null)}
        />
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal 
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onRemoveMember={removeMember}
          onInvite={() => setShowInviteForm(selectedTeam.team.id)}
        />
      )}
    </div>
  );
};

// Team Card Component
const TeamCard = ({ team, isOwner, onSelect, onInvite }) => (
  <div className="team-card" onClick={onSelect}>
    <div className="team-card-header">
      <h4>{team.name}</h4>
      <span className={`role-badge ${isOwner ? 'owner' : team.user_role}`}>
        {isOwner ? 'Owner' : team.user_role}
      </span>
    </div>
    <p className="team-description">{team.description || 'No description'}</p>
    <div className="team-stats">
      <span>{team.member_count} members</span>
      <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
    </div>
    {isOwner && (
      <button 
        className="btn btn-sm btn-secondary"
        onClick={(e) => { e.stopPropagation(); onInvite(); }}
      >
        Invite
      </button>
    )}
  </div>
);

// Create Team Modal
const CreateTeamModal = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Team</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Team Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter team name"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Optional team description"
              rows="3"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invite User Modal
const InviteUserModal = ({ teamId, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({ email: '', role: 'viewer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Invite Team Member</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="user@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="viewer">Viewer - Can view all data</option>
              <option value="editor">Editor - Can edit materials and products</option>
              <option value="admin">Admin - Full access except team deletion</option>
            </select>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Team Details Modal
const TeamDetailsModal = ({ team, onClose, onRemoveMember, onInvite }) => {
  const canManage = team.team.user_role === 'owner' || team.team.user_role === 'admin';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{team.team.name}</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="team-details">
          <p>{team.team.description || 'No description provided'}</p>
          
          <div className="team-section">
            <div className="section-header">
              <h4>Members ({team.members.length})</h4>
              {canManage && (
                <button className="btn btn-sm btn-primary" onClick={onInvite}>
                  Invite Member
                </button>
              )}
            </div>
            
            <div className="members-list">
              {team.members.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-info">
                    <span className="member-id">User #{member.user_id}</span>
                    <span className={`role-badge ${member.role}`}>{member.role}</span>
                  </div>
                  <div className="member-actions">
                    <span className="join-date">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </span>
                    {canManage && member.role !== 'owner' && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => onRemoveMember(team.team.id, member.user_id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {team.invitations && team.invitations.length > 0 && (
            <div className="team-section">
              <h4>Pending Invitations ({team.invitations.length})</h4>
              <div className="invitations-list">
                {team.invitations.map(invitation => (
                  <div key={invitation.id} className="invitation-item">
                    <span>{invitation.email}</span>
                    <span className={`role-badge ${invitation.role}`}>{invitation.role}</span>
                    <span className="expires">
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManager;
