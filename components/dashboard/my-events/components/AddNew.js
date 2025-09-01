import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AddNew({ userData }) {
  const router = useRouter();

  const handleCreateEvent = () => {
    // Navigate to the full event creation form
    router.push('/events/new');
  };

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Create New Event</h2>
        <p style={{ margin: 0, color: '#666' }}>Start creating your next event</p>
      </div>

      <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ marginBottom: '15px' }}>Ready to Create Your Event?</h3>
        <p style={{ marginBottom: '25px', color: '#666', lineHeight: '1.5' }}>
          Our comprehensive event creation form will guide you through setting up:
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px', textAlign: 'left' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📅 Event Details</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
              <li>Event title and description</li>
              <li>Dates and venue information</li>
              <li>Event type and category</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📝 Applications</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
              <li>Application requirements</li>
              <li>Custom application fields</li>
              <li>Deadlines and fees</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🎨 Media & SEO</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
              <li>Event images and media</li>
              <li>Search engine optimization</li>
              <li>Social media integration</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>💰 Pricing</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
              <li>Application and jury fees</li>
              <li>Booth and admission fees</li>
              <li>Payment processing</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleCreateEvent}
            className="primary"
            style={{ padding: '12px 24px', fontSize: '16px' }}
          >
            Start Creating Event
          </button>
          <Link 
            href="/events" 
            className="secondary"
            style={{ padding: '12px 24px', fontSize: '16px', textDecoration: 'none', display: 'inline-block' }}
          >
            Browse Existing Events
          </Link>
        </div>
      </div>

      {userData && (userData.user_type === 'admin' || userData.user_type === 'promoter') && (
        <div className="form-card" style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Quick Tips for Event Creation</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', fontSize: '14px', color: '#666' }}>
            <div>
              <strong style={{ color: '#333' }}>📋 Plan Ahead:</strong> Have your event details, venue information, and application requirements ready before starting.
            </div>
            <div>
              <strong style={{ color: '#333' }}>🎯 Be Specific:</strong> Clear descriptions and requirements help attract the right artists to your event.
            </div>
            <div>
              <strong style={{ color: '#333' }}>💡 Save Often:</strong> The form auto-saves your progress, but you can save drafts and return later.
            </div>
            <div>
              <strong style={{ color: '#333' }}>🔍 SEO Matters:</strong> Good titles and descriptions help artists find your event through search engines.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
