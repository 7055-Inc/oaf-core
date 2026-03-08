'use client';
import SidebarMenu from './SidebarMenu';

export default function Sidebar({ userData, collapsed = false, onToggle, notifications = {} }) {
  return (
    <aside className={`dashboard-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* File-tab style toggle on right edge */}
      <button 
        className="dashboard-sidebar-toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ 
            width: '12px', 
            height: '12px', 
            stroke: '#055474', 
            strokeWidth: 3,
            transform: collapsed ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.3s ease' 
          }}
        >
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>
      
      <nav className="sidebar-menu">
        <SidebarMenu userData={userData} collapsed={collapsed} notifications={notifications} />
      </nav>
    </aside>
  );
}
