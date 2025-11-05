// Marketplace Seller Subscription Component (UNIVERSAL FLOW)
// Shows ONLY the "Marketplace Seller" tier (Free)
// Backend unified with Verified - appears separate to users

import React from 'react';
import ChecklistController from '../../../subscriptions/ChecklistController';
import MarketplaceDashboard from '../../../subscriptions/dashboards/MarketplaceDashboard';

export default function MarketplaceSellerSubscription({ userData }) {
  
  // Marketplace Seller Configuration
  const marketplaceConfig = {
    displayName: "Marketplace Seller Subscription",
    subtitle: "Sell your handmade work on our marketplace - verified badge included!",
    autoApprove: false,  // Requires manual admin approval
    dashboardComponent: MarketplaceDashboard,
    
    // Single tier - free (revenue from commissions)
    tiers: [
      {
        name: "Marketplace Seller",
        description: "Sell on marketplace + get verified badge automatically (free!)",
        price: 0,  // Free - revenue from marketplace commissions
        priceDisplay: "FREE",
        period: "",
        features: [
          "Sell on OAF Marketplace",
          "FREE Verified Artist badge (included!)",
          "No monthly fees - just commission",
          "Reach thousands of buyers",
          "Manual review of your work",
          "Integrated store management",
          "Automatic verified status"
        ],
        popular: true,
        buttonText: "Apply to Sell"
      }
    ],
    
    // Application form fields (same as verified)
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
    
    // API endpoint for application submission (same as verified)
    applicationEndpoint: 'api/subscriptions/verified/marketplace-applications/submit',
    applicationMethod: 'POST'
  };
  
  return (
    <ChecklistController 
      subscriptionType="verified"  // Same backend as verified!
      userData={userData}
      config={marketplaceConfig}
    />
  );
}

