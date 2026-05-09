# Mobile OTP Integration for Forgot Password

## Overview

This document explains the integration of Mobile OTP functionality for the forgot password feature using SMS Panda API.

## Features Implemented

### 1. **Backend Components**

#### OTP Model (`Server/models/OTP.js`)

- Stores temporary OTP records with mobile number and OTP code
- Auto-expires after 10 minutes using MongoDB TTL index
- Tracks failed OTP verification attempts (max 3 attempts)

#### SMS Service (`Server/services/smsService.js`)

- `sendSMS(mobile, message)`: Sends SMS via SMS Panda API
- `generateOTP()`: Generates a random 6-digit OTP
- Handles SMS API requests with error handling
- Configurable via environment variables

#### API Endpoints (`Server/routes/auth.js`)

**1. POST `/api/auth/forgot-password`**

- Request: `{ mobile: "10digitNumber" }`
- Validates mobile number is registered in User model
- Returns error if number not registered: `"Number Not Registered"`
- Generates OTP and sends SMS
- Returns success message

**2. POST `/api/auth/verify-otp`**

- Request: `{ mobile: "10digitNumber", otp: "6digitOTP" }`
- Verifies OTP and tracks failed attempts
- Returns resetToken (valid for 15 minutes) on success
- Blocks after 3 failed attempts

**3. POST `/api/auth/reset-password-otp`**

- Request: `{ mobile: "10digitNumber", newPassword: "password", resetToken: "token" }`
- Verifies reset token
- Updates user password
- Returns success message

### 2. **Frontend Components**

#### ForgotPassword Page (`Client/src/pages/ForgotPassword.js`)

Three-step flow:

1. **Mobile Number**: Enter registered mobile number
2. **OTP Verification**: Enter 6-digit OTP with 10-minute countdown
3. **Password Reset**: Set new password with confirmation

Features:

- Real-time OTP countdown timer
- Resend OTP functionality
- Password visibility toggle
- Comprehensive error messages
- Step-by-step navigation

#### Styling (`Client/src/pages/ForgotPassword.css`)

- Modern gradient background
- Responsive design (mobile-friendly)
- Smooth animations
- Professional UI with proper spacing

### 3. **Environment Configuration**

Add to `.env`:

```
# SMS Panda API Configuration
SMS_API_URL=http://sms.pandeyra.com/submitsms.jsp
SMS_USER=KLPROSMS
SMS_KEY=53816a6606XX
SMS_SENDER_ID=KLPROX
```

## API Request/Response Examples

### 1. Send OTP

**Request:**

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "mobile": "9876543210"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "OTP sent to your registered mobile number"
}
```

**Response (Not Registered):**

```json
{
  "success": false,
  "message": "Number Not Registered"
}
```

### 2. Verify OTP

**Request:**

```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Reset Password

**Request:**

```bash
POST /api/auth/reset-password-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "newPassword": "NewPassword@123",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Flow Diagram

```
User -> Click "Forgot Password" on Login Page
         |
         v
User -> ForgotPassword Component
         |
         v
Step 1: Enter Mobile Number
  |-> API: /api/auth/forgot-password
  |-> Backend: Check if mobile is registered
  |   |-> If Not Registered: Show error message
  |   |-> If Registered: Generate OTP, Send SMS, Return success
         |
         v
Step 2: Enter OTP
  |-> API: /api/auth/verify-otp
  |-> Backend: Verify OTP, Generate reset token
         |
         v
Step 3: Set New Password
  |-> API: /api/auth/reset-password-otp
  |-> Backend: Update user password
  |-> Redirect to Login page
```

## Security Features

1. **OTP Expiration**: OTP automatically expires after 10 minutes
2. **Attempt Limiting**: Maximum 3 failed OTP verification attempts
3. **Reset Token**: JWT token valid for 15 minutes for password reset
4. **Password Validation**: Minimum 6 characters required
5. **Mobile Verification**: Checks if mobile is registered before sending OTP
6. **Password Hashing**: Uses bcryptjs for secure password storage

## SMS API Integration

### SMS Panda API Endpoint Format:

```
http://sms.pandeyra.com/submitsms.jsp?user=KLPROSMS&key=53816a6606XX&mobile=XXXXXXXX&message=XXXXXXX&senderid=KLPROX&accusage=1
```

**Parameters:**

- `user`: SMS Panda username (KLPROSMS)
- `key`: SMS Panda API key (53816a6606XX)
- `mobile`: Recipient mobile number
- `message`: SMS message text (URL encoded)
- `senderid`: Sender ID (KLPROX)
- `accusage`: Account usage flag (1)

## Testing Instructions

### 1. Test Mobile Number Validation

- Open: `http://localhost:3000/forgot-password`
- Enter an unregistered mobile number (e.g., 9999999999)
- Expected: "Number Not Registered" message

### 2. Test OTP Sending

- Enter a registered mobile number from User database
- Expected: OTP sent to registered mobile
- Check SMS on phone

### 3. Test OTP Verification

- Enter correct OTP from SMS
- Expected: Move to password reset step

### 4. Test Password Reset

- Enter new password and confirm
- Click "Reset Password"
- Expected: Redirect to login page with success message
- Try logging in with new password

## Database Queries

### Check Registered Users

```javascript
db.users.find({ phone: "9876543210" });
```

### View OTP Records

```javascript
db.otps.find({ mobile: "9876543210" });
```

## Troubleshooting

### SMS Not Sending

1. Check SMS API credentials in `.env`
2. Verify mobile number format (10 digits)
3. Check API rate limits
4. Review SMS Panda account balance

### OTP Verification Fails

1. Ensure OTP is within 10-minute window
2. Check if mobile number matches
3. Verify OTP hasn't been used already

### Password Reset Not Working

1. Verify reset token is still valid (15 minutes)
2. Check password meets minimum requirements
3. Ensure mobile number is registered

## File Structure

```
Server/
├── models/
│   └── OTP.js (OTP storage model)
├── services/
│   └── smsService.js (SMS sending service)
├── routes/
│   └── auth.js (Authentication endpoints including forgot password)
└── .env (SMS API credentials)

Client/
├── pages/
│   ├── ForgotPassword.js (Main component)
│   └── ForgotPassword.css (Styling)
├── App.js (Updated with routing)
└── pages/
    └── Login.js (Updated forgot password handler)
```

## Future Enhancements

1. Email OTP as alternative to SMS
2. Admin dashboard to manage OTPs
3. SMS sending logs and analytics
4. Rate limiting per mobile number
5. Custom OTP message templates
6. Support for multiple languages
7. Two-factor authentication integration

## Support Information

For SMS issues, contact SMS Panda Support:

- Website: https://sms.pandeyra.com
- Username: KLPROSMS
- Password: Klp@123
- Code: 85158
