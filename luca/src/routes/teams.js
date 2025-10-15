const express = require('express');
const crypto = require('crypto');
const { executeQuery, getConnection } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * Team Management API Routes for Luca Platform
 * Handles team creation, invitations, member management
 */

// Get user's teams (owned and member of)
router.get('/my-teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get teams owned by user
    const ownedTeams = await executeQuery(`
      SELECT t.*, 
             COUNT(tm.id) as member_count,
             'owner' as user_role
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
      WHERE t.owner_user_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [userId]);

    // Get teams user is a member of
    const memberTeams = await executeQuery(`
      SELECT t.*, 
             COUNT(tm2.id) as member_count,
             tm.role as user_role,
             tm.permissions as user_permissions
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN team_members tm2 ON t.id = tm2.team_id AND tm2.is_active = TRUE
      WHERE tm.user_id = ? AND tm.is_active = TRUE AND t.owner_user_id != ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [userId, userId]);

    // Parse permissions for member teams
    memberTeams.forEach(team => {
      try {
        team.user_permissions = JSON.parse(team.user_permissions || '{}');
      } catch (e) {
        team.user_permissions = {};
      }
    });

    res.json({
      success: true,
      data: {
        owned_teams: ownedTeams,
        member_teams: memberTeams
      }
    });

  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({
      error: 'Failed to fetch teams',
      message: 'Unable to retrieve team information'
    });
  }
});

// Create a new team
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid team name',
        message: 'Team name must be at least 2 characters long'
      });
    }

    // Check if user already has a team with this name
    const existingTeam = await executeQuery(`
      SELECT id FROM teams WHERE owner_user_id = ? AND name = ?
    `, [userId, name.trim()]);

    if (existingTeam.length > 0) {
      return res.status(400).json({
        error: 'Team name already exists',
        message: 'You already have a team with this name'
      });
    }

    // Create the team
    const result = await executeQuery(`
      INSERT INTO teams (name, description, owner_user_id)
      VALUES (?, ?, ?)
    `, [name.trim(), description || null, userId]);

    const teamId = result.insertId;

    // The trigger should automatically add the owner as a team member
    // Let's verify and get the complete team info
    const newTeam = await executeQuery(`
      SELECT t.*, 
             COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
      WHERE t.id = ?
      GROUP BY t.id
    `, [teamId]);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: newTeam[0]
    });

  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      error: 'Failed to create team',
      message: 'Unable to create team. Please try again.'
    });
  }
});

// Get team details with members
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.userId;

    // Check if user has access to this team
    const teamAccess = await executeQuery(`
      SELECT t.*, tm.role as user_role, tm.permissions as user_permissions
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ? AND tm.is_active = TRUE
      WHERE t.id = ? AND (t.owner_user_id = ? OR tm.user_id IS NOT NULL)
    `, [userId, teamId, userId]);

    if (teamAccess.length === 0) {
      return res.status(404).json({
        error: 'Team not found',
        message: 'Team not found or you do not have access to it'
      });
    }

    const team = teamAccess[0];
    
    // Parse user permissions
    try {
      team.user_permissions = JSON.parse(team.user_permissions || '{}');
    } catch (e) {
      team.user_permissions = {};
    }

    // Get team members
    const members = await executeQuery(`
      SELECT tm.*, 
             CASE 
               WHEN tm.user_id = t.owner_user_id THEN 'Owner'
               ELSE 'Member'
             END as member_type
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.team_id = ? AND tm.is_active = TRUE
      ORDER BY 
        CASE WHEN tm.role = 'owner' THEN 1 
             WHEN tm.role = 'admin' THEN 2 
             WHEN tm.role = 'editor' THEN 3 
             ELSE 4 END,
        tm.joined_at ASC
    `, [teamId]);

    // Parse permissions for each member
    members.forEach(member => {
      try {
        member.permissions = JSON.parse(member.permissions || '{}');
      } catch (e) {
        member.permissions = {};
      }
    });

    // Get pending invitations (only if user is owner or admin)
    let invitations = [];
    if (team.user_role === 'owner' || team.user_role === 'admin') {
      invitations = await executeQuery(`
        SELECT * FROM team_invitations 
        WHERE team_id = ? AND accepted_at IS NULL AND declined_at IS NULL AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [teamId]);
    }

    res.json({
      success: true,
      data: {
        team,
        members,
        invitations
      }
    });

  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({
      error: 'Failed to fetch team details',
      message: 'Unable to retrieve team information'
    });
  }
});

// Add user to team directly
router.post('/:teamId/add-member', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { targetUserId, role = 'viewer', permissions } = req.body;
    const userId = req.userId;

    if (!targetUserId) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'Please provide a valid user ID'
      });
    }

    // Check if user can add members (must be owner or admin)
    const teamAccess = await executeQuery(`
      SELECT t.*, tm.role as user_role
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ? AND tm.is_active = TRUE
      WHERE t.id = ? AND (t.owner_user_id = ? OR (tm.user_id IS NOT NULL AND tm.role IN ('owner', 'admin')))
    `, [userId, teamId, userId]);

    if (teamAccess.length === 0) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only team owners and admins can add members'
      });
    }

    // Check if user is already a member
    const existingMember = await executeQuery(`
      SELECT id FROM team_members 
      WHERE team_id = ? AND user_id = ? AND is_active = TRUE
    `, [teamId, targetUserId]);

    if (existingMember.length > 0) {
      return res.status(400).json({
        error: 'User already a member',
        message: 'This user is already a member of the team'
      });
    }

    // Check if user is trying to add themselves
    if (parseInt(targetUserId) === parseInt(userId)) {
      return res.status(400).json({
        error: 'Cannot add yourself',
        message: 'You are already a member of this team'
      });
    }

    // Default permissions based on role
    const defaultPermissions = {
      owner: { materials: 'edit', products: 'edit', collections: 'edit', shipping: 'edit', reports: 'view' },
      admin: { materials: 'edit', products: 'edit', collections: 'edit', shipping: 'edit', reports: 'view' },
      editor: { materials: 'edit', products: 'edit', collections: 'view', shipping: 'view', reports: 'view' },
      viewer: { materials: 'view', products: 'view', collections: 'view', shipping: 'view', reports: 'view' }
    };

    const finalPermissions = permissions || defaultPermissions[role] || defaultPermissions.viewer;

    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();

      // Add user directly as team member
      await connection.execute(`
        INSERT INTO team_members (team_id, user_id, role, permissions, invited_by)
        VALUES (?, ?, ?, ?, ?)
      `, [teamId, targetUserId, role, JSON.stringify(finalPermissions), userId]);

      // Log the activity
      await connection.execute(`
        INSERT INTO team_activity_log (team_id, user_id, action_type, target_user_id, details)
        VALUES (?, ?, 'member_added', ?, ?)
      `, [teamId, userId, targetUserId, JSON.stringify({ 
        added_user_id: targetUserId, 
        role, 
        added_by_user_id: userId 
      })]);

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'User added to team successfully',
        data: {
          user_id: targetUserId,
          role,
          permissions: finalPermissions
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      error: 'Failed to add member',
      message: 'Unable to add user to team. Please try again.'
    });
  }
});

// Note: Email invitation system removed - users are now added directly by team owners/admins

// Remove team member (owner/admin only)
router.delete('/:teamId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = req.userId;

    // Check permissions (owner or admin)
    const teamAccess = await executeQuery(`
      SELECT t.*, tm.role as user_role
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ? AND tm.is_active = TRUE
      WHERE t.id = ? AND (t.owner_user_id = ? OR (tm.user_id IS NOT NULL AND tm.role IN ('owner', 'admin')))
    `, [userId, teamId, userId]);

    if (teamAccess.length === 0) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only team owners and admins can remove members'
      });
    }

    // Cannot remove the team owner
    if (memberId == teamAccess[0].owner_user_id) {
      return res.status(400).json({
        error: 'Cannot remove owner',
        message: 'Team owner cannot be removed from the team'
      });
    }

    // Remove member
    const result = await executeQuery(`
      UPDATE team_members 
      SET is_active = FALSE 
      WHERE team_id = ? AND user_id = ? AND is_active = TRUE
    `, [teamId, memberId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member not found in this team'
      });
    }

    // Log the activity
    await executeQuery(`
      INSERT INTO team_activity_log (team_id, user_id, action_type, target_user_id, details)
      VALUES (?, ?, 'member_removed', ?, ?)
    `, [teamId, userId, memberId, JSON.stringify({ removed_by_user_id: userId })]);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      error: 'Failed to remove member',
      message: 'Unable to remove team member. Please try again.'
    });
  }
});

module.exports = router;
