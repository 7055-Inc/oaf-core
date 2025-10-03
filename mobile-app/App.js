import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupAutoRefresh, clearAutoRefresh } from './lib/auth';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';

const { width, height } = Dimensions.get('window');

// Welcome Screen Component (shown first time)
function WelcomeScreen({ onShowLogin, onShowSignup }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#055474', '#3e1c56']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo/Brand Area */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('./assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitle}>Discover • Create • Connect</Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to Your Creative Journey</Text>
            <Text style={styles.welcomeDescription}>
              Connect with artists, discover unique artwork, and be part of a vibrant creative community.
            </Text>
          </View>

          {/* Authentication Buttons */}
          <View style={styles.authButtonsContainer}>
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={onShowLogin}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.signupButton} 
              onPress={onShowSignup}
            >
              <Text style={styles.signupButtonText}>Sign up to get started</Text>
            </TouchableOpacity>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>🎨</Text>
              </View>
              <Text style={styles.featureText}>Discover Art</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>🤝</Text>
              </View>
              <Text style={styles.featureText}>Connect</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>📱</Text>
              </View>
              <Text style={styles.featureText}>Mobile First</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      <StatusBar style="light" />
    </View>
  );
}

// Main App Screen Component (when logged in)
function MainAppScreen({ onLogout }) {
  return (
    <View style={styles.mainAppContainer}>
      <View style={styles.header}>
        <Image 
          source={require('./assets/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.mainContent}>
        <Text style={styles.welcomeBackTitle}>Welcome back!</Text>
        <Text style={styles.mainAppDescription}>
          Your Online Art Festival mobile app is ready to explore.
        </Text>
        
        {/* Main App Navigation Cards */}
        <View style={styles.navCardsContainer}>
          <TouchableOpacity style={styles.navCard}>
            <Text style={styles.navCardIcon}>🎨</Text>
            <Text style={styles.navCardTitle}>Browse Art</Text>
            <Text style={styles.navCardSubtitle}>Discover amazing artwork</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navCard}>
            <Text style={styles.navCardIcon}>👤</Text>
            <Text style={styles.navCardTitle}>My Profile</Text>
            <Text style={styles.navCardSubtitle}>Manage your account</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navCard}>
            <Text style={styles.navCardIcon}>📅</Text>
            <Text style={styles.navCardTitle}>Events</Text>
            <Text style={styles.navCardSubtitle}>Upcoming festivals</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navCard}>
            <Text style={styles.navCardIcon}>🛍️</Text>
            <Text style={styles.navCardTitle}>Shop</Text>
            <Text style={styles.navCardSubtitle}>Purchase artwork</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.persistentAuthInfo}>
          <Text style={styles.persistentAuthText}>
            ✅ You'll stay logged in automatically
          </Text>
          <Text style={styles.persistentAuthSubtext}>
            Your session will refresh in the background
          </Text>
        </View>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

// Main App Component
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('welcome'); // 'welcome', 'login', 'signup'

  // Check for existing authentication on app startup
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (token && refreshToken) {
        // Validate token with backend
        const response = await fetch('https://api.beemeeart.com/auth/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: 'validate',
            token: token
          })
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
          setupAutoRefresh(); // Start auto-refresh for existing users
          console.log('User already authenticated - auto-refresh enabled');
        } else {
          // Token invalid, clear storage
          await AsyncStorage.multiRemove(['token', 'refreshToken', 'userId']);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear potentially corrupted tokens
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'userId']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen('welcome');
  };

  const handleLogout = async () => {
    try {
      clearAutoRefresh(); // Stop auto-refresh
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'userId']);
      setIsAuthenticated(false);
      setCurrentScreen('welcome');
      console.log('User logged out - auto-refresh disabled');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const showLogin = () => setCurrentScreen('login');
  const showSignup = () => setCurrentScreen('signup');
  const showWelcome = () => setCurrentScreen('welcome');

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('./assets/logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If authenticated, show main app
  if (isAuthenticated) {
    return <MainAppScreen onLogout={handleLogout} />;
  }

  // Show appropriate authentication screen
  switch (currentScreen) {
    case 'login':
      return <LoginScreen onLogin={handleLogin} onSwitchToSignup={showSignup} />;
    case 'signup':
      return <SignupScreen onLogin={handleLogin} onSwitchToLogin={showLogin} />;
    default:
      return <WelcomeScreen onShowLogin={showLogin} onShowSignup={showSignup} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
    shadowColor: 'white',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.75,
    shadowRadius: 2,
    elevation: 20,
  },
  brandSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  authButtonsContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loginButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#055474',
  },
  signupButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 250,
    borderWidth: 2,
    borderColor: 'white',
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  // Main App Styles
  mainAppContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  logoutButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  welcomeBackTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  mainAppDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    lineHeight: 22,
  },
  navCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  navCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navCardIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  navCardSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  persistentAuthInfo: {
    marginTop: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(5, 84, 116, 0.1)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(5, 84, 116, 0.2)',
  },
  persistentAuthText: {
    fontSize: 14,
    color: '#055474',
    fontWeight: '600',
    marginBottom: 5,
  },
  persistentAuthSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});
