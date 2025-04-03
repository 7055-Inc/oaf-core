import React, { useState, useEffect } from 'react';
import Permissions from '../permissions/Permissions';
import './MyAccount.css';

function MyAccount({ isLoggedIn }) {
  const [activeSection, setActiveSection] = useState('Dashboards');
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/permissions')
        .then(res => res.json())
        .then(data => {
          fetch('/api/session')
            .then(res => res.json())
            .then(session => {
              const user = data.find(u => u.id === session.user.id);
              setPermissions(user || {});
            });
        });
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    fetch('/api/logout', { method: 'POST' })
      .then(() => window.location.reload());
  };

  if (!isLoggedIn) {
    return (
      <div className="myaccount">
        <div className="menu">Please log in to access your account</div>
        <div className="work-area">
          <h2>Login</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
              })
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) window.location.reload();
                else alert(data.error);
              });
          }}>
            <label>Email:</label>
            <input type="email" name="username" autoComplete="username" required />
            <label>Password:</label>
            <input type="password" name="password" autoComplete="current-password" required />
            <button type="submit">Login</button>
            <p>Need an account? <a href="/register">Register here</a></p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="myaccount">
      <div className="menu">
        <ul>
          {permissions.profile_access === 'yes' && <li><a href="#" onClick={() => setActiveSection('Account')}>Account</a></li>}
          {permissions.profile_access === 'yes' && <li><a href="#" onClick={() => setActiveSection('Profile')}>Profile</a></li>}
          {(permissions.marketplace_vendor === 'yes' || permissions.is_customer === 'yes') && <li><a href="#" onClick={() => setActiveSection('Orders')}>Orders</a></li>}
          {permissions.is_admin === 'yes' && <li><a href="#" onClick={() => setActiveSection('Permissions')}>Permissions</a></li>}
          <li><a href="#" onClick={() => setActiveSection('EmailPreferences')}>Email Preferences</a></li>
          <li><a href="#" className="logout-link" onClick={handleLogout}>Log out</a></li> {/* Changed to <a> */}
        </ul>
      </div>
      <div className="work-area">
        {activeSection === 'Dashboards' && <h2>Dashboards Placeholder</h2>}
        {activeSection === 'Account' && permissions.profile_access === 'yes' && <h2>Account Placeholder</h2>}
        {activeSection === 'Profile' && permissions.profile_access === 'yes' && <h2>Profile Placeholder</h2>}
        {activeSection === 'Orders' && (permissions.marketplace_vendor === 'yes' || permissions.is_customer === 'yes') && <h2>Orders Placeholder</h2>}
        {activeSection === 'Permissions' && permissions.is_admin === 'yes' && <Permissions isLoggedIn={isLoggedIn} setActiveSection={setActiveSection} />}
        {activeSection === 'EmailPreferences' && <h2>Email Preferences</h2>}
      </div>
    </div>
  );
}

export default MyAccount;