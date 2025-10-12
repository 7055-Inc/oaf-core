// Next.js API route to proxy Leo AI search requests
// This bypasses CSP restrictions by making the request server-side

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward the request to Leo AI platform using new intelligent search
    const leoResponse = await fetch('http://localhost:3003/api/learning/intelligent-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data = await leoResponse.json();

    // Forward the response status and data
    res.status(leoResponse.status).json(data);
    
  } catch (error) {
    console.error('Leo search proxy error:', error);
    res.status(500).json({ 
      error: 'Search service unavailable',
      message: 'Unable to connect to Leo AI platform'
    });
  }
}
