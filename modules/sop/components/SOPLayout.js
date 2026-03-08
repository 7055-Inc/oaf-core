/**
 * SOP Layout Component
 * Main layout wrapper for SOP pages
 */

import React from 'react';
import Link from 'next/link';
import { SOPProvider } from './SOPContext';

export default function SOPLayout({ children }) {
  return (
    <SOPProvider>
      <div className="sop-layout">
        {/* Header */}
        <header className="sop-header">
          <div className="sop-header-inner">
            <Link href="/sop" className="sop-logo">
              <span className="sop-logo-icon">📋</span>
              <span className="sop-logo-text">SOP Center</span>
            </Link>

            <nav className="sop-nav">
              <Link href="/sop" className="sop-nav-link">
                Browse
              </Link>
              <Link href="/dashboard" className="sop-nav-link">
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="sop-content">
          {children}
        </main>

        {/* Footer */}
        <footer className="sop-footer">
          <div className="sop-footer-inner">
            <p>Standard Operating Procedures</p>
            <Link href="/dashboard">Back to Dashboard</Link>
          </div>
        </footer>
      </div>
    </SOPProvider>
  );
}
