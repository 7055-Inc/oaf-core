/**
 * Shipping Labels Subscription Configuration
 * 
 * Configuration for the ChecklistController-based subscription flow.
 * Used by ShippingLabelsSubscription gate component.
 */

export const shippingLabelsConfig = {
  displayName: "Shipping Labels Service",
  subtitle: "Create shipping labels on-demand with no monthly fees",
  autoApprove: true,  // Application is auto-approved (just info collection)
  subscriptionType: 'shipping_labels',
  
  // Single tier configuration (no monthly fee, pay-as-you-go)
  tiers: [
    {
      name: "Shipping Labels",
      description: "Pay-as-you-go shipping label service. Only pay for the labels you create.",
      price: "$0",
      period: "/month",
      features: [
        "No monthly fees",
        "Pay only for labels you create",
        "Access to all major carriers (USPS, UPS, FedEx)",
        "Competitive shipping rates",
        "Real-time rate comparison",
        "Automatic tracking number generation",
        "Label history and management",
        "Print labels from your browser",
        "Use Connect balance or card on file",
        "Cancel anytime with no penalties"
      ],
      popular: true,
      buttonText: "Get Started"
    }
  ],
  
  // Application form fields (return address + preferences)
  applicationFields: [
    {
      section: "Return Address",
      fields: [
        { 
          name: 'return_company_name', 
          label: 'Company Name', 
          type: 'text',
          placeholder: 'Your Company Name',
          required: false 
        },
        { 
          name: 'return_contact_name', 
          label: 'Contact Name', 
          type: 'text',
          placeholder: 'Contact Person Name',
          required: false 
        },
        { 
          name: 'return_address_line_1', 
          label: 'Address Line 1', 
          type: 'text',
          placeholder: 'Street Address',
          required: true 
        },
        { 
          name: 'return_address_line_2', 
          label: 'Address Line 2', 
          type: 'text',
          placeholder: 'Suite, Apt, etc. (optional)',
          required: false 
        },
        { 
          name: 'return_city', 
          label: 'City', 
          type: 'text',
          placeholder: 'City',
          required: true 
        },
        { 
          name: 'return_state', 
          label: 'State', 
          type: 'text',
          placeholder: 'State/Province',
          required: true 
        },
        { 
          name: 'return_postal_code', 
          label: 'Postal Code', 
          type: 'text',
          placeholder: 'ZIP/Postal Code',
          required: true 
        },
        { 
          name: 'return_country', 
          label: 'Country', 
          type: 'select',
          options: [
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' }
          ],
          default: 'US',
          required: true 
        },
        { 
          name: 'return_phone', 
          label: 'Phone Number', 
          type: 'tel',
          placeholder: 'Phone Number',
          required: false 
        }
      ]
    },
    {
      section: "Label Preferences",
      fields: [
        { 
          name: 'label_size_preference', 
          label: 'Label Size', 
          type: 'select',
          options: [
            { value: '4x6', label: '4" x 6" (Standard)' },
            { value: '8.5x11', label: '8.5" x 11" (Full Page)' }
          ],
          default: '4x6',
          required: false 
        },
        { 
          name: 'signature_required_default', 
          label: 'Require signature by default', 
          type: 'checkbox',
          default: false,
          required: false 
        },
        { 
          name: 'insurance_default', 
          label: 'Add insurance by default', 
          type: 'checkbox',
          default: false,
          required: false 
        }
      ]
    }
  ],
  
  // v2 API endpoint for preferences submission
  applicationEndpoint: '/api/v2/commerce/shipping/preferences',
  applicationMethod: 'POST'
};

export default shippingLabelsConfig;
