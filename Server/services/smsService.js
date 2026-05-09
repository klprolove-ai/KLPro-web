const axios = require('axios');

const sendSMS = async (mobile, message) => {
  try {
    const smsApiUrl = process.env.SMS_API_URL || 'http://sms.pandeyra.com/submitsms.jsp';
    const smsUser = process.env.SMS_USER || 'KLPROSMS';
    const smsKey = process.env.SMS_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID || 'KLPROX';

    if (!smsKey) {
      throw new Error('SMS_KEY environment variable not configured');
    }

    const url = `${smsApiUrl}?user=${smsUser}&key=${smsKey}&mobile=${mobile}&message=${encodeURIComponent(message)}&senderid=${smsSenderId}&accusage=1`;

    const response = await axios.get(url, {
      timeout: 10000,
    });

    console.log('SMS sent successfully:', response.data);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

module.exports = {
  sendSMS,
  generateOTP,
};
