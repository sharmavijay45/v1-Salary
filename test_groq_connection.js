// Test script to verify Groq API connection
import axios from 'axios';

async function testGroqConnection() {
  console.log('Testing Groq API connection...');

  try {
    const response = await axios.post(
      `${process.env.GROQ_API_URL}/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: "Hello, test message"
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Groq API connection successful!');
    console.log('Response:', response.data.choices[0]?.message?.content);

  } catch (error) {
    console.error('❌ Groq API connection failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('URL used:', `${process.env.GROQ_API_URL}/chat/completions`);
  }
}

testGroqConnection();