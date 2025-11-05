// Websites Subscription Component (UNIVERSAL FLOW)
// Uses the universal ChecklistController pattern

import React from 'react';
import ChecklistController from '../../../subscriptions/ChecklistController';
import WebsitesDashboard from '../../../subscriptions/dashboards/WebsitesDashboard';

export default function WebsitesSubscription({ userData }) {
  
  // Websites Subscription Configuration
  const websitesConfig = {
    displayName: "Website Subscription",
    subtitle: "Create stunning artist websites with your OAF data",
    autoApprove: true,  // No manual approval required
    dashboardComponent: WebsitesDashboard,  // Subscription-specific dashboard
    
    // Multiple pricing tiers
    tiers: [
      {
        name: "Starter Plan",
        description: "Simple setup, core features, great for getting started",
        price: 14.99,  // Numeric for billing
        priceDisplay: "$14.99",  // String for display
        period: "/month",
        features: [
          "1 Website",
          "Subdomain included",
          "Basic templates",
          "Use your OAF data to build a complete site in minutes",
          "Community support"
        ],
        popular: false,
        buttonText: "Get Started"
      },
      {
        name: "Professional Plan",
        description: "Build a professional brand, grow your online presence, connect with your shoppers",
        price: 24.95,
        priceDisplay: "$24.95",
        period: "/month",
        features: [
          "Everything in Starter Plan",
          "Use your Custom domain",
          "Premium design templates",
          "Access to premium addons",
          "Priority Support",
          "Access to custom design services"
        ],
        popular: true,
        buttonText: "Go Pro"
      },
      {
        name: "Business Plan",
        description: "Take your art business to the next level with marketplace connectors, wholesale access and brand building tools",
        price: 49.95,
        priceDisplay: "$49.95",
        period: "/month",
        features: [
          "Everything in Starter and Professional Plans",
          "Access to multiple websites with custom domains",
          "Premium addons and marketplace connectors",
          "Wholesale pricing",
          "Dedicated support",
          "Core analytics"
        ],
        popular: false,
        buttonText: "Upgrade to Business"
      },
      {
        name: "Promoter Plan",
        description: "Grow your event and promote your artists with tools tailored to help you drive more traffic to your event participants",
        price: 49.95,
        priceDisplay: "$49.95",
        period: "/month",
        features: [
          "Includes all artist pro features, plus",
          "Tools to help you sell merch",
          "Application and jury tools",
          "Invoicing and acceptance management",
          "Excel at SEO and web optimization"
        ],
        popular: false,
        buttonText: "Get Promoter Access",
        // Special layout: centered on own row
        specialLayout: 'centered'
      },
      {
        name: "Promoter Business Plan",
        description: "Advanced event promotion with professional website tools, smart templates, and comprehensive brand management",
        price: 79.95,
        priceDisplay: "$79.95",
        period: "/month",
        features: [
          "Everything in Promoter Plan, plus",
          "Professional website builder with smart templates",
          "Advanced color palette tools and customization",
          "Live site editor with real-time preview",
          "Multiple event websites with custom domains",
          "Enhanced analytics and reporting",
          "Priority dedicated support"
        ],
        popular: false,
        buttonText: "Get Promoter Business",
        // Special layout: centered on own row
        specialLayout: 'centered'
      }
    ],
    
    // No application form needed - auto-approved
    applicationFields: null,
    applicationEndpoint: null,
    applicationMethod: null
  };
  
  return (
    <ChecklistController 
      subscriptionType="websites"
      userData={userData}
      config={websitesConfig}
    />
  );
}

