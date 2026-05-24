const axios = require('axios');

const sendSMS = async (mobile, message) => {
  try {
    // Prefer a base URL (without path) so deploy-time configs can control host and path
    const smsApiBase = process.env.SMS_API_BASE || process.env.SMS_API_URL || 'https://sms.pandeyra.com';
    const smsUser = process.env.SMS_USER || 'KLPROSMS';
    // Support both SMS_KEY and SMS_PASSWORD env names
    const smsKey = process.env.SMS_KEY || process.env.SMS_PASSWORD;
    const smsCode = process.env.SMS_CODE; // optional additional code param some providers use
    const smsSenderId = process.env.SMS_SENDER_ID || 'KLPROX';

    if (!smsKey) {
      throw new Error('SMS_KEY environment variable not configured');
    }

    // Sanitize mobile number: keep only digits
    let sanitizedMobile = String(mobile || '').replace(/\D/g, '');
    // If number contains country code +91 or similar, keep it; otherwise, if it's 10 digits assume India and prefix 91
    if (sanitizedMobile.length === 10) {
      sanitizedMobile = `91${sanitizedMobile}`;
    } else if (sanitizedMobile.length > 10) {
      // If user passed country code (e.g., 9198xxxx...), keep as-is. If extra digits, prefer the last 12 (e.g., 91 + 10 digits)
      if (sanitizedMobile.length >= 12) {
        sanitizedMobile = sanitizedMobile.slice(-12);
      }
    }

    // Build endpoint: if smsApiBase already includes a path to submitsms.jsp or similar, use it as-is.
    let endpoint = smsApiBase.replace(/\/$/, '');
    if (!/submitsms/i.test(endpoint)) {
      endpoint = endpoint + '/submitsms.jsp';
    }

    // Collapse any accidental duplicate submitsms.jsp segments (defensive)
    endpoint = endpoint.replace(/(\/submitsms\.jsp)+/ig, '/submitsms.jsp');

    const params = [];
    // Include both user and username to be compatible with different providers
    params.push(`user=${encodeURIComponent(smsUser)}`);
    params.push(`username=${encodeURIComponent(smsUser)}`);

    // Include both key and password if provided by env
    const smsKeyEnv = process.env.SMS_KEY;
    const smsPasswordEnv = process.env.SMS_PASSWORD;
    if (smsKeyEnv) params.push(`key=${encodeURIComponent(smsKeyEnv)}`);
    if (smsPasswordEnv) params.push(`password=${encodeURIComponent(smsPasswordEnv)}`);

    // Also include the generic smsKey variable if set (backwards compatibility)
    if (smsKey && !smsKeyEnv && !smsPasswordEnv) {
      params.push(`key=${encodeURIComponent(smsKey)}`);
    }

    if (smsCode) params.push(`code=${encodeURIComponent(smsCode)}`);
    params.push(`mobile=${encodeURIComponent(sanitizedMobile)}`);
    params.push(`message=${encodeURIComponent(message)}`);
    // Include both sender and senderid
    params.push(`senderid=${encodeURIComponent(smsSenderId)}`);
    params.push(`sender=${encodeURIComponent(smsSenderId)}`);
    params.push('accusage=1');

    const url = `${endpoint}?${params.join('&')}`;

    // Mask sensitive query params in logs (do not print actual key/password)
    const maskedUrl = url.replace(/(key=)[^&]*/i, '$1****').replace(/(password=)[^&]*/i, '$1****');
    console.log('Sending SMS via URL:', maskedUrl);

    const response = await axios.get(url, {
      timeout: 15000,
    });

    console.log('SMS API response status:', response.status);
    console.log('SMS API response data:', response.data);

    // Some SMS gateways return non-200 but still indicate success in body; treat HTTP 200 as success
    const success = response.status === 200;

    return {
      success,
      data: response.data,
    };
  } catch (error) {
    console.error('Error sending SMS:', error && error.message ? error.message : error);
    if (error.response) {
      console.error('SMS API response data:', error.response.data);
    }
    return {
      success: false,
      error: error && error.message ? error.message : String(error),
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
