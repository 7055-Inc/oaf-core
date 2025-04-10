import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import './AnnouncementBar.css'; // Added CSS import

/**
 * Announcement bar that displays messages from admin to users
 * Can be targeted to specific user types
 */
const AnnouncementBar = ({ userType }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userSettings, setUserSettings] = useState(null);
  
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // This will be implemented in the backend to fetch announcements
        // For now, use dummy data
        const dummyAnnouncements = [
          {
            id: 1,
            message: "Welcome to the new dashboard system!",
            type: "primary", // Changed from "info" to "primary"
            target_users: ["all"],
            start_date: "2023-10-01",
            end_date: "2023-12-31"
          },
          {
            id: 2,
            message: "Admins: New user management features available",
            type: "secondary", // Changed from "success" to "secondary"
            target_users: ["admin"],
            start_date: "2023-10-01",
            end_date: "2023-12-31"
          },
          {
            id: 3,
            message: "Artists: October submission deadline approaching",
            type: "secondary",
            target_users: ["artist"],
            start_date: "2023-10-01",
            end_date: "2023-12-31"
          }
        ];
        
        // Mock user settings for announcement visibility
        // This would come from the user's profile settings in a real implementation
        const mockUserSettings = {
          hide_announcements: false,
          hide_announcement_types: []
        };
        setUserSettings(mockUserSettings);

        // Only show announcements if user hasn't disabled them
        if (mockUserSettings.hide_announcements) {
          setAnnouncements([]);
          setLoading(false);
          return;
        }
        
        // Filter announcements by user type and settings
        const filtered = dummyAnnouncements.filter(
          announcement => {
            // Check if this type is hidden in user settings
            if (mockUserSettings.hide_announcement_types.includes(announcement.type)) {
              return false;
            }
            
            // Check if announcement targets this user type
            return announcement.target_users.includes('all') || 
                   announcement.target_users.includes(userType);
          }
        );
        
        setAnnouncements(filtered);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setLoading(false);
      }
    };
    
    fetchAnnouncements();
    
    // Rotate announcements every 5 seconds if there are multiple
    let interval;
    if (announcements.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex(prevIndex => 
          prevIndex === announcements.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userType, announcements.length]);
  
  // Hide announcement bar if no announcements or still loading
  if (loading || announcements.length === 0) {
    return null;
  }
  
  const currentAnnouncement = announcements[currentIndex];
  
  return (
    <div className={`dashboard-announcement ${currentAnnouncement.type}`}>
      {announcements.length > 1 && (
        <div className="announcement-indicators">
          {announcements.map((_, index) => (
            <span 
              key={index} 
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
      <span className="announcement-message">{currentAnnouncement.message}</span>
    </div>
  );
};

export default AnnouncementBar; 