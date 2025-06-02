// Simple test script to verify image upload functionality
const axios = require('axios');

// Test with a small base64 image (1x1 pixel red dot)
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testImageUpload() {
  try {
    console.log('Testing image upload...');
    console.log('Image size:', (testImage.length * 0.75 / 1024).toFixed(2), 'KB');
    
    const response = await axios.put('http://localhost:5000/api/profile', {
      name: 'Test User',
      profileImage: testImage
    }, {
      headers: {
        'Authorization': 'Bearer test-token', // This will fail auth but test payload size
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('✅ Payload size OK - Auth failed as expected');
    } else if (error.response?.status === 413) {
      console.log('❌ Payload too large error');
    } else {
      console.log('Error:', error.response?.status, error.response?.data || error.message);
    }
  }
}

testImageUpload();