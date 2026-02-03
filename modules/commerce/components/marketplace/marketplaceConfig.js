/**
 * Marketplace Subscription Configuration
 * 
 * Configuration for the ChecklistController pattern.
 * Marketplace Seller tier - free with commission-based revenue.
 */

export const marketplaceConfig = {
  displayName: "Marketplace Seller",
  subtitle: "Sell your handmade work on Brakebee",
  applicationTitle: "Apply to Sell",
  applicationSubtitle: "Submit your application to join our curated marketplace",
  autoApprove: false,  // Requires manual admin approval
  paymentReason: "Your card will be used for shipping label purchases, if your account goes negative, for add-on subscriptions, and automatic renewals.",
  
  // Single tier - free (revenue from commissions)
  tiers: [
    {
      name: "Marketplace Seller",
      description: "Sell on the marketplace and get verified automatically",
      price: 0,
      priceDisplay: "FREE",
      period: "",
      features: [
        "Sell on the Brakebee Marketplace",
        "FREE Verified Artist badge included",
        "No monthly fees - just commission on sales",
        "Reach thousands of art buyers",
        "Join our community of juried artists",
        "Integrated store management tools"
      ],
      popular: true,
      buttonText: "Apply to Sell"
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
  
  // API endpoint for application submission
  applicationEndpoint: 'api/subscriptions/verified/marketplace-applications/submit',
  applicationMethod: 'POST'
};
