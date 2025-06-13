'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.split('token=')[1]?.split(';')[0];
    if (!token) {
      router.push('/');
    } else {
      setIsLoggedIn(true);
      // Fetch user data to check roles
      fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user data');
          }
          return res.json();
        })
        .then(data => {
          console.log('Dashboard - Current User Data:', data);
          setUserData(data);
        })
        .catch(err => {
          console.error('Error fetching user data:', err.message);
          setError(err.message);
        });
    }
  }, [router]);

  if (!isLoggedIn) {
    return null;
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1>Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  const isAdmin = userData.user_type === 'admin';
  const isVendor = userData.user_type === 'vendor';
  const canManageProducts = isAdmin || isVendor;
  console.log('Dashboard - isAdmin:', isAdmin, 'isVendor:', isVendor);

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Dashboard</h1>
        </div>
        
        <div className={styles.tableContainer}>
          <div className={styles.section}>
            <h2>Quick Links</h2>
            <div className={styles.actionButtons}>
              <Link href="/api-keys" className={styles.primaryButton}>
                Generate API Keys
              </Link>
              {canManageProducts && (
                <>
                  <Link href="/dashboard/products" className={styles.primaryButton}>
                    View Products
                  </Link>
                  <Link href="/products/new" className={styles.primaryButton}>
                    Add New Product
                  </Link>
                </>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className={styles.section}>
              <h2>Admin Tools</h2>
              <div className={styles.actionButtons}>
                <Link href="/dashboard/admin" className={styles.primaryButton}>
                  User Management
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 