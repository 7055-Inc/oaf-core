/**
 * Verified Artist Subscription Configuration
 * 
 * Configuration for the ChecklistController pattern.
 * Verified Artist tier - $50/year for verification badge.
 */

export const verifiedConfig = {
  displayName: "",
  subtitle: "",
  applicationTitle: "Apply for Verification",
  applicationSubtitle: "Submit your application to become a verified artist",
  autoApprove: false,  // Requires manual admin approval
  paymentReason: "Your card will be charged the annual verification fee and used for automatic renewals.",
  
  tiers: [
    {
      name: "Verified Artist",
      description: "Annual verification badge proving you create your own work",
      price: 50,
      priceDisplay: "$50",
      period: "/year",
      features: [
        "Verified artist badge on your profile",
        "Proof your work is handmade by you",
        "Increased buyer trust and credibility",
        "Manual jury-style review of your creative process",
        "Lasts a full year",
        "Access to verified-only features",
        'Marked as "Verified Handmade" during jurying process with participating events',
        "Featured placement for marketplace sellers"
      ],
      buttonText: "Get Verified"
    },
    {
      name: "Free with Marketplace",
      description: "Marketplace sellers are automatically verified at no extra cost",
      price: 0,
      priceDisplay: "Free",
      period: "",
      features: [
        "Verified artist badge included with your marketplace subscription"
      ],
      popular: true,
      buttonText: "Join the Marketplace",
      redirectUrl: "/dashboard/commerce/marketplace"
    }
  ],
  
  // Application form fields (same as marketplace - shared table)
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
      description: "Upload photos/videos showing your creative process. This helps us verify your work is handmade.",
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
  
  subscriptionApiBase: 'api/v2/commerce/subscriptions/verified',
  applicationEndpoint: '/api/v2/commerce/subscriptions/verified/marketplace-applications/submit',
  applicationMethod: 'POST'
};
