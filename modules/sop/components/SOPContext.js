/**
 * SOP Context - Shared state for SOP module
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  fetchSopUser,
  fetchFolderTree,
  fetchFoldersFlat,
  fetchSops,
} from '../../../lib/sop';

const SOPContext = createContext(null);

export function SOPProvider({ children }) {
  // Auth state
  const [sopUser, setSopUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Data state
  const [folders, setFolders] = useState([]);
  const [foldersFlat, setFoldersFlat] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(false);

  // Check SOP auth status
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const user = await fetchSopUser();
      setSopUser(user);
      return user;
    } catch (err) {
      const errorCode = err.message?.includes('NOT_ENROLLED') ? 'NOT_ENROLLED' 
        : err.message?.includes('NO_TOKEN') ? 'NO_TOKEN'
        : 'AUTH_ERROR';
      setAuthError({ code: errorCode, message: err.message });
      setSopUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      const [tree, flat] = await Promise.all([
        fetchFolderTree(),
        fetchFoldersFlat()
      ]);
      setFolders(tree);
      setFoldersFlat(flat);
      return tree;
    } catch (err) {
      console.error('Failed to load folders:', err);
      return [];
    }
  }, []);

  // Load SOPs for a folder
  const loadSops = useCallback(async (folderId = null, options = {}) => {
    setSopsLoading(true);
    try {
      const list = await fetchSops({
        folder_id: folderId,
        ...options
      });
      setSops(list);
      return list;
    } catch (err) {
      console.error('Failed to load SOPs:', err);
      return [];
    } finally {
      setSopsLoading(false);
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Computed values
  const isTop = sopUser?.user_type === 'top';
  const isAuthenticated = !!sopUser;

  const value = {
    // Auth
    sopUser,
    isLoading,
    authError,
    isTop,
    isAuthenticated,
    checkAuth,
    
    // Folders
    folders,
    foldersFlat,
    currentFolder,
    setCurrentFolder,
    loadFolders,
    
    // SOPs
    sops,
    sopsLoading,
    loadSops,
  };

  return (
    <SOPContext.Provider value={value}>
      {children}
    </SOPContext.Provider>
  );
}

export function useSOP() {
  const context = useContext(SOPContext);
  if (!context) {
    throw new Error('useSOP must be used within a SOPProvider');
  }
  return context;
}

export default SOPContext;
