/**
 * Newsletter Subscription API
 * 
 * Handles email subscription via ActiveCampaign
 * POST /api/subscribe-newsletter
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  // Validate email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  // Check for required environment variables
  const apiUrl = process.env.ACTIVECAMPAIGN_API_URL;
  const apiKey = process.env.ACTIVECAMPAIGN_API_KEY;
  const listIds = process.env.ACTIVECAMPAIGN_LIST_IDS; // Comma-separated list IDs (e.g., "1,8,13")

  if (!apiUrl || !apiKey || !listIds) {
    return res.status(500).json({ message: 'Email service not configured' });
  }

  // Parse list IDs
  const lists = listIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

  try {
    // Step 1: Create or update contact in ActiveCampaign
    const contactResponse = await fetch(`${apiUrl}/api/3/contacts`, {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact: {
          email: email.toLowerCase().trim(),
        },
      }),
    });

    let contactData;
    
    if (contactResponse.status === 422) {
      // Contact already exists - look them up
      const searchResponse = await fetch(
        `${apiUrl}/api/3/contacts?email=${encodeURIComponent(email.toLowerCase().trim())}`,
        {
          headers: { 'Api-Token': apiKey },
        }
      );
      const searchData = await searchResponse.json();
      
      if (searchData.contacts && searchData.contacts.length > 0) {
        contactData = { contact: searchData.contacts[0] };
      } else {
        return res.status(500).json({ message: 'Unable to process subscription' });
      }
    } else if (!contactResponse.ok) {
      const errorData = await contactResponse.json();
      return res.status(500).json({ message: 'Unable to process subscription' });
    } else {
      contactData = await contactResponse.json();
    }

    const contactId = contactData.contact?.id;
    
    if (!contactId) {
      return res.status(500).json({ message: 'Unable to process subscription' });
    }

    // Step 2: Add contact to all specified lists
    for (const listId of lists) {
      const listResponse = await fetch(`${apiUrl}/api/3/contactLists`, {
        method: 'POST',
        headers: {
          'Api-Token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactList: {
            list: listId,
            contact: parseInt(contactId, 10),
            status: 1, // 1 = subscribed
          },
        }),
      });

      // Ignore errors for individual lists (contact may already be subscribed)
      // Just continue to next list
      if (!listResponse.ok) {
        // Log but don't fail - they might already be on this list
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed!' 
    });

  } catch (error) {
    return res.status(500).json({ message: 'Network error. Please try again.' });
  }
}
