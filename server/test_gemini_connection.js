// Test script to verify Gemini API connection
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGeminiConnection() {
  console.log('Testing Gemini API connection...');
  console.log('API URL:', process.env.GEMINI_API_URL);
  console.log('API Key exists:', !!process.env.GEMINI_API_KEY);

  try {
    const response = await axios.post(
      `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: "Hello, this is a test message. Please respond with a simple greeting."
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 100,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Gemini API connection successful!');
    console.log('Response:', response.data.candidates[0]?.content?.parts[0]?.text);

  } catch (error) {
    console.error('❌ Gemini API connection failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full URL:', `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`);
  }
}

testGeminiConnection();