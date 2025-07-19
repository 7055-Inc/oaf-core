const axios = require('axios');

async function testPaymentIntent() {
  console.log('🧪 Testing create-payment-intent endpoint...\n');
  
  // Test data
  const testData = {
    cart_items: [
      { product_id: 2000000116, quantity: 2 },
      { product_id: 2000000118, quantity: 1 }
    ]
  };
  
  console.log('Test data:', JSON.stringify(testData, null, 2));
  
  try {
    // First, let's get a token (using the admin user from our test)
    const tokenResponse = await axios.post('https://api2.onlineartfestival.com/auth/exchange', {
      token: 'test-token',
      provider: 'validate'
    });
    
    if (tokenResponse.data.token) {
      console.log('✅ Got auth token');
      
      // Now test the payment intent endpoint
      const response = await axios.post('https://api2.onlineartfestival.com/checkout/create-payment-intent', testData, {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Payment intent created successfully!');
      console.log('Response:', response.data);
    } else {
      console.log('❌ Failed to get auth token');
    }
    
  } catch (error) {
    console.error('❌ Error testing payment intent:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testPaymentIntent(); 