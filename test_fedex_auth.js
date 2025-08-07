require('dotenv').config();
const axios = require('axios');

async function testFedExAuth() {
  console.log('Testing FedEx Authentication...');
  console.log('API Key:', process.env.FEDEX_API_KEY);
  console.log('API Secret:', process.env.FEDEX_API_SECRET ? '[SET]' : '[NOT SET]');
  console.log('Account Number:', process.env.FEDEX_ACCOUNT_NUMBER);
  
  try {
    const response = await axios.post(
      'https://apis-sandbox.fedex.com/auth/oauth/v2/token',
      {
        grant_type: 'client_credentials',
        client_id: process.env.FEDEX_API_KEY,
        client_secret: process.env.FEDEX_API_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ FedEx Authentication Successful!');
    console.log('Token Type:', response.data.token_type);
    console.log('Expires In:', response.data.expires_in, 'seconds');
    console.log('Access Token (first 20 chars):', response.data.access_token.substring(0, 20) + '...');
    
  } catch (error) {
    console.log('❌ FedEx Authentication Failed!');
    console.log('Status:', error.response?.status);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testFedExAuth();
