'use client';
import SidebarMenu from './SidebarMenu';

export default function Sidebar({ userData, collapsed = false, onToggle }) {
  return (
    <aside className={`dashboard-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="dashboard-sidebar-header">
        <button 
          className="dashboard-sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
          >
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
      </div>
      
      <nav className="sidebar-menu">
        <SidebarMenu userData={userData} collapsed={collapsed} />
      </nav>
    </aside>
  );
}
