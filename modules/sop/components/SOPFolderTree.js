/**
 * SOP Folder Tree Component
 * Displays hierarchical folder structure for navigation
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useSOP } from './SOPContext';
import { createFolder } from '../../../lib/sop';

function FolderItem({ folder, level = 0, currentFolderId }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = folder.children && folder.children.length > 0;
  const isActive = currentFolderId === folder.id;

  return (
    <div className="sop-folder-item">
      <div 
        className={`sop-folder-row ${isActive ? 'sop-folder-active' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren && (
          <button 
            className="sop-folder-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
          </button>
        )}
        {!hasChildren && <span className="sop-folder-spacer"></span>}
        
        <Link href={`/sop/folder/${folder.id}`} className="sop-folder-link">
          <i className="fas fa-folder"></i>
          <span className="sop-folder-title">{folder.title}</span>
        </Link>
      </div>

      {hasChildren && isExpanded && (
        <div className="sop-folder-children">
          {folder.children.map(child => (
            <FolderItem 
              key={child.id} 
              folder={child} 
              level={level + 1}
              currentFolderId={currentFolderId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SOPFolderTree({ currentFolderId = null }) {
  const { folders, loadFolders, isTop } = useSOP();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [parentId, setParentId] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderTitle.trim()) return;

    setCreating(true);
    try {
      await createFolder({
        title: newFolderTitle.trim(),
        parent_id: parentId
      });
      setNewFolderTitle('');
      setParentId(null);
      setShowCreateModal(false);
      await loadFolders();
    } catch (err) {
      alert('Failed to create folder: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="sop-folder-tree">
      <div className="sop-folder-header">
        <h3>Folders</h3>
        {isTop && (
          <button 
            className="btn btn-sm btn-outline"
            onClick={() => setShowCreateModal(true)}
            title="Create folder"
          >
            <i className="fas fa-plus"></i>
          </button>
        )}
      </div>

      <div className="sop-folder-list">
        <Link 
          href="/sop" 
          className={`sop-folder-row sop-folder-root ${!currentFolderId ? 'sop-folder-active' : ''}`}
        >
          <i className="fas fa-home"></i>
          <span>All SOPs</span>
        </Link>

        {folders.map(folder => (
          <FolderItem 
            key={folder.id} 
            folder={folder}
            currentFolderId={currentFolderId}
          />
        ))}

        {folders.length === 0 && (
          <p className="sop-folder-empty">No folders yet</p>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Create Folder</h4>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label htmlFor="folder-title">Folder Name</label>
                <input
                  id="folder-title"
                  type="text"
                  className="form-control"
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  placeholder="Enter folder name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="parent-folder">Parent Folder (optional)</label>
                <select
                  id="parent-folder"
                  className="form-control"
                  value={parentId || ''}
                  onChange={(e) => setParentId(e.target.value || null)}
                >
                  <option value="">Root (no parent)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creating || !newFolderTitle.trim()}
                >
                  {creating ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
