import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, NavLink } from 'react-router-dom';
import Modal from 'react-modal';
import './App.css';
import Home from './Home';
import MyAccount from './myaccount/MyAccount';
import Product from './product/Product';
import Cart from './cart/Cart';
import ProductCreationPage from './product/pages/ProductCreationPage';
import { UserProvider, useUser, auth } from './users/users';
import Login from './users/login';
import Checklist from './components/checklist/Checklist';
import ChecklistGuard from './components/checklist/ChecklistGuard';
import { AuthProvider } from './contexts/AuthContext';

// Placeholder components for routes that may be implemented later
const GalleryPage = () => <div>Gallery Page</div>;
const ArtworkDetail = () => <div>Artwork Detail</div>;
const ArtistsPage = () => <div>Artists Page</div>;
const ArtistProfile = () => <div>Artist Profile</div>;
const EventsPage = () => <div>Events Page</div>;
const AboutPage = () => <div>About Page</div>;
const CreateProduct = () => <div>Create Product Page</div>;

Modal.setAppElement('#root');

// Protected route component
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

// Protected route with checklist validation
function ChecklistProtectedRoute({ children }) {
  const { currentUser, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <ChecklistGuard>{children}</ChecklistGuard>;
}

function App() {
  const { currentUser } = useUser();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const openLoginModal = () => setShowLoginModal(true);
  const closeLoginModal = () => setShowLoginModal(false);

  const handleLogout = () => {
    auth.signOut();
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
                  <a href="#" onClick={(e) => { e.preventDefault(); openLoginModal(); }}>Log in or Register</a>
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
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery/:artId" element={<ArtworkDetail />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artists/:artistId" element={<ArtistProfile />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/cart" element={<Cart />} />
          
          {/* Checklist route - protected but no checklist validation */}
          <Route path="/checklist" element={
            <ProtectedRoute>
              <Checklist />
            </ProtectedRoute>
          } />
          
          {/* Protected routes with checklist validation */}
          <Route path="/myaccount/*" element={
            <ChecklistProtectedRoute>
              <MyAccount />
            </ChecklistProtectedRoute>
          } />
          <Route path="/create-product" element={
            <ChecklistProtectedRoute>
              <CreateProduct />
            </ChecklistProtectedRoute>
          } />
        </Routes>
      </main>

      <Modal
        isOpen={showLoginModal}
        onRequestClose={closeLoginModal}
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
        <Login onClose={closeLoginModal} />
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
          <p>© {new Date().getFullYear()} Online Art Festival. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <UserProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UserProvider>
    </Router>
  );
}