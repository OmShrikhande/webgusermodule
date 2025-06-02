/**
 * Utility to check email configuration
 */
const nodemailer = require('nodemailer');

/**
 * Check if email configuration is properly set up
 * @returns {Object} Configuration status
 */
function checkEmailConfig() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  const result = {
    configured: false,
    issues: []
  };
  
  // Check if environment variables are set
  if (!emailUser) {
    result.issues.push('EMAIL_USER environment variable is not set');
  } else if (!emailUser.includes('@')) {
    result.issues.push('EMAIL_USER does not appear to be a valid email address');
  }
  
  if (!emailPass) {
    result.issues.push('EMAIL_PASS environment variable is not set');
  } else if (emailPass.length < 8) {
    result.issues.push('EMAIL_PASS appears to be too short (less than 8 characters)');
  }
  
  // If both are set, try to create a transporter
  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
      
      result.transporter = 'created';
      result.configured = result.issues.length === 0;
    } catch (error) {
      result.issues.push(`Error creating transporter: ${error.message}`);
    }
  }
  
  return result;
}

/**
 * Test sending an email
 * @param {string} testEmail - Email address to send test to
 * @returns {Promise<Object>} Test result
 */
async function testEmailSending(testEmail) {
  if (!testEmail || !testEmail.includes('@')) {
    return {
      success: false,
      message: 'Invalid test email address'
    };
  }
  
  const configCheck = checkEmailConfig();
  if (!configCheck.configured) {
    return {
      success: false,
      message: 'Email not properly configured',
      issues: configCheck.issues
    };
  }
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Geofence Alert System - Test Email',
      text: `This is a test email from your geofence alert system.\n\nTimestamp: ${new Date().toISOString()}\n\nIf you received this email, your email configuration is working correctly.`
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Test email sent successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to send test email',
      error: error.message
    };
  }
}

module.exports = {
  checkEmailConfig,
  testEmailSending
};