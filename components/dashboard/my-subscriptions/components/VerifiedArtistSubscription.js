// Verified Artist Subscription Component (UNIVERSAL FLOW)
// Shows ONLY the "Verified Artist" tier ($50/year)
// Backend unified with Marketplace - appears separate to users

import React from 'react';
import ChecklistController from '../../../subscriptions/ChecklistController';
import VerifiedDashboard from '../../../subscriptions/dashboards/VerifiedDashboard';

export default function VerifiedArtistSubscription({ userData }) {
  
  // Verified Artist Configuration
  const verifiedConfig = {
    displayName: "Verified Artist Subscription",
    subtitle: "Get your verified badge - prove your work is handmade by you",
    autoApprove: false,  // Requires manual admin approval
    dashboardComponent: VerifiedDashboard,
    
    // Single tier - annual billing
    tiers: [
      {
        name: "Verified Artist",
        description: "Annual verification badge proving you create your own work",
        price: 50,  // Annual fee
        priceDisplay: "$50",
        period: "/year",
        features: [
          "Verified artist badge on your profile",
          "Proof of handmade work",
          "Increased buyer trust",
          "Manual review of your work process",
          "Annual renewal (prevents fraud)",
          "Access to verified-only features"
        ],
        popular: true,
        buttonText: "Get Verified"
      }
    ],
    
    // Application form fields
    applicationFields: [
      {
        section: "About Your Work",
        fields: [
          {
            name: "work_description",
            label: "Describe your creative process and the work you make",
            type: "textarea",
            required: true,
            placeholder: "Tell us about your art, materials, techniques, and creative process..."
          },
          {
            name: "additional_info",
            label: "Additional information (optional)",
            type: "textarea",
            required: false,
            placeholder: "Any other details you'd like to share..."
          }
        ]
      },
      {
        section: "Verification Media",
        description: "Upload photos/videos showing your creative process",
        fields: [
          {
            name: "raw_materials_media_id",
            label: "Raw Materials",
            type: "media",
            required: false
          },
          {
            name: "work_process_1_media_id",
            label: "Work in Progress (Step 1)",
            type: "media",
            required: false
          },
          {
            name: "work_process_2_media_id",
            label: "Work in Progress (Step 2)",
            type: "media",
            required: false
          },
          {
            name: "work_process_3_media_id",
            label: "Work in Progress (Step 3)",
            type: "media",
            required: false
          },
          {
            name: "artist_at_work_media_id",
            label: "Photo of You Creating Your Work",
            type: "media",
            required: false
          },
          {
            name: "booth_display_media_id",
            label: "Booth/Studio Display",
            type: "media",
            required: false
          },
          {
            name: "artist_working_video_media_id",
            label: "Video of You Working (optional)",
            type: "media",
            required: false
          },
          {
            name: "artist_bio_video_media_id",
            label: "Artist Bio Video (optional)",
            type: "media",
            required: false
          }
        ]
      }
    ],
    
    // API endpoint for application submission
    applicationEndpoint: 'api/subscriptions/verified/marketplace-applications/submit',
    applicationMethod: 'POST'
  };
  
  return (
    <ChecklistController 
      subscriptionType="verified"
      userData={userData}
      config={verifiedConfig}
    />
  );
}

