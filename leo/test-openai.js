// Test OpenAI connection
require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI connection...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Leo, an AI assistant for an art marketplace."
        },
        {
          role: "user",
          content: "Say hello and confirm you're working!"
        }
      ],
      max_tokens: 50
    });

    console.log('✅ OpenAI connection successful!');
    console.log('Response:', response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error.message);
  }
}

testOpenAI();
