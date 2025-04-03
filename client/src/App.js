import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Modal from 'react-modal';
import './App.css';
import Home from './Home';
import MyAccount from './myaccount/MyAccount';
import Login from './user-management/Login';
import ResetPassword from './user-management/ResetPassword';
import RegistrationContainer from './user-management/registration-parts/Registration-container';
import Product from './product/Product';
import Cart from './cart/Cart';
import ProductCreationPage from './product/pages/ProductCreationPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

Modal.setAppElement('#root');

// Protected route component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="App">
      <header>
        <div className="header-content">
          <div className="logo">
            <a href="/"><img src="/media/logo.png" alt="OAF Logo" /></a>
          </div>
          <div className="search-placeholder">Search coming soon</div>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              {currentUser && <li><a href="/myaccount">My Account</a></li>}
              <li><a href="/cart">Cart</a></li>
              <li>
                {currentUser ? (
                  <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Log out</a>
                ) : (
                  <a href="#" onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}>Log in or Register</a>
                )}
              </li>
            </ul>
          </nav>
        </div>
        <hr className="header-hr" />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/myaccount" element={
            <ProtectedRoute>
              <MyAccount />
            </ProtectedRoute>
          } />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register/*" element={<RegistrationContainer />} />
          <Route path="/product/:productId" element={<Product />} />
          <Route path="/product" element={<Product />} />
          <Route path="/product/create" element={
            <ProtectedRoute>
              <ProductCreationPage />
            </ProtectedRoute>
          } />
          <Route path="/vendor/products/create" element={
            <ProtectedRoute>
              <ProductCreationPage />
            </ProtectedRoute>
          } />
          <Route path="/cart" element={<Cart />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '400px',
            width: '100%',
            padding: '20px',
            borderRadius: '0',
            fontFamily: "'Playwrite Italia Moderna', cursive"
          }
        }}
      >
        <Login setIsModalOpen={setIsModalOpen} />
      </Modal>
      <footer>
        <div className="social-row">
          <a href="https://facebook.com"><i className="fab fa-facebook-f"></i></a>
          <a href="https://x.com"><i className="fab fa-twitter"></i></a>
          <a href="https://pinterest.com"><i className="fab fa-pinterest-p"></i></a>
          <a href="https://tiktok.com"><i className="fab fa-tiktok"></i></a>
          <a href="https://instagram.com"><i className="fab fa-instagram"></i></a>
          <a href="https://linkedin.com"><i className="fab fa-linkedin-in"></i></a>
        </div>
        <div className="footer-columns">
          <div className="column">
            <h2>Join the Community</h2>
            <hr className="column-hr" />
            <ul>
              <li><a href="/apply-sell">Apply to Sell</a></li>
              <li><a href="/promoter-signup">Promoter Signup</a></li>
              <li><a href="/become-affiliate">Become an Affiliate</a></li>
              <li><a href="/wholesale">Apply for Wholesale</a></li>
            </ul>
          </div>
          <div className="column">
            <h2>Dashboards</h2>
            <hr className="column-hr" />
            <ul>
              <li><a href="/myaccount">My Account</a></li>
              <li><a href="/affiliate-dashboard">Affiliate Dashboard</a></li>
              <li><a href="/artist-dashboard">Artist Dashboard</a></li>
              <li><a href="/event-portal">Event Portal</a></li>
            </ul>
          </div>
          <div className="column">
            <h2>Learn More</h2>
            <hr className="column-hr" />
            <ul>
              <li><a href="/blog">The OAF Blog</a></li>
              <li><a href="/support">OAF Support</a></li>
              <li><a href="/vendor-support">Vendor Support Lounge</a></li>
            </ul>
          </div>
          <div className="column">
            <h2>Important Information</h2>
            <hr className="column-hr" />
            <ul>
              <li><a href="/terms">Terms & Conditions</a></li>
              <li><a href="/returns">Return Policy</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <hr className="footer-hr" />
        <div className="copyright">
          <p>© 2025 Online Art Festival. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  );
}