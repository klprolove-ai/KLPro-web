const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Professional = require('../models/Professional');
const OTP = require('../models/OTP');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const { sendSMS, generateOTP } = require('../services/smsService');

const uploadImageToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(fileBuffer);
  });
};

const normalizeArrayField = (fieldValue) => {
  if (!fieldValue) return [];
  if (Array.isArray(fieldValue)) {
    return fieldValue.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(fieldValue)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

  const isValidPanCardNumber = (value) => /^[A-Z0-9]{10}$/.test(String(value || '').trim().toUpperCase());

  const isValidAadhaarCardNumber = (value) => /^\d{12}$/.test(String(value || '').trim());

// Register
router.post(
  '/register',
  upload.fields([
    { name: 'panCardImage', maxCount: 1 },
    { name: 'aadhaarCardImage', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
  ]),
  async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      city,
      phone,
      userType,
      professionalCategory,
      professionalSubCategory,
      professionalSubSubCategory,
      professionalServiceType,
      panCardNumber,
      aadhaarCardNumber,
      experience,
      bio,
      currentCity,
    } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();
    const normalizedCity = String(city || '').trim();
    const normalizedUserType = String(userType || 'customer').trim();

    if (!name || !normalizedEmail || !password || !normalizedPhone || !normalizedCity || !normalizedUserType) {
      return res.status(400).json({ message: 'Name, email, password, phone, city and account type are required' });
    }

    if (normalizedUserType === 'professional') {
      if (!isValidPanCardNumber(panCardNumber)) {
        return res.status(400).json({ message: 'PAN Card Number must be exactly 10 alphanumeric characters' });
      }

      if (!isValidAadhaarCardNumber(aadhaarCardNumber)) {
        return res.status(400).json({ message: 'Aadhaar Card Number must be exactly 12 digits' });
      }
    }

    // Check if user exists by email or phone
    let existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      city,
      phone,
      userType: normalizedUserType,
      approvalStatus: normalizedUserType === 'professional' ? 'pending' : 'approved',
      approvalNote: normalizedUserType === 'professional' ? 'Awaiting admin approval' : '',
    });

    await user.save();

    if (normalizedUserType === 'professional') {
      const panCardImageFile = req.files?.panCardImage?.[0];
      const aadhaarCardImageFile = req.files?.aadhaarCardImage?.[0];
      const profileImageFile = req.files?.profileImage?.[0];

      const professionalCategories = normalizeArrayField(professionalCategory);
      const professionalSubCategories = normalizeArrayField(professionalSubCategory);
      const professionalSubSubCategories = normalizeArrayField(professionalSubSubCategory);
      const professionalServiceTypes = normalizeArrayField(professionalServiceType);

        if (!professionalCategories.length || !professionalSubCategories.length || !panCardNumber || !aadhaarCardNumber) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          message: 'Professional category, subcategory, PAN card number and Aadhaar card number are required',
        });
      }

      if (!profileImageFile) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          message: 'Professional photo is required',
        });
      }

      if (!panCardImageFile || !aadhaarCardImageFile) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          message: 'PAN card image and Aadhaar card image are required',
        });
      }

      if (!experience || Number(experience) <= 0 || !bio) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          message: 'Experience and short bio are required for professional registration',
        });
      }

      let panCardImageUrl = '';
      let aadhaarCardImageUrl = '';
      let profileImageUrl = '';

      try {
        panCardImageUrl = await uploadImageToCloudinary(
          panCardImageFile.buffer,
          'kl-services/professionals/pan-cards'
        );
        aadhaarCardImageUrl = await uploadImageToCloudinary(
          aadhaarCardImageFile.buffer,
          'kl-services/professionals/aadhaar-cards'
        );

        if (profileImageFile) {
          profileImageUrl = await uploadImageToCloudinary(
            profileImageFile.buffer,
            'kl-services/professionals/profile-images'
          );
        }
      } catch (uploadError) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          message: 'Failed to upload PAN/Aadhaar images',
          error: uploadError.message,
        });
      }

      if (profileImageUrl) {
        user.profileImage = profileImageUrl;
        await user.save();
      }

      const professional = new Professional({
        userId: user._id,
        specializations: [
          ...professionalSubCategories,
          ...professionalSubSubCategories,
          ...professionalServiceTypes,
        ].filter(Boolean),
        categories: professionalCategories,
        subCategories: professionalSubCategories,
        subSubCategories: professionalSubSubCategories,
        serviceTypes: professionalServiceTypes,
        category: String(professionalCategories[0] || professionalCategory || '').trim(),
        subCategory: String(professionalSubCategories[0] || professionalSubCategory || '').trim(),
        subSubCategory: String(professionalSubSubCategories[0] || professionalSubSubCategory || '').trim() || '',
        serviceType: String(professionalServiceTypes[0] || professionalServiceType || '').trim() || '',
        currentCity: currentCity || city || '',
        panCardNumber: String(panCardNumber).trim().toUpperCase(),
        panCardImageUrl,
        aadhaarCardNumber: String(aadhaarCardNumber).trim(),
        aadhaarCardImageUrl,
        experience: Number(experience) > 0 ? Number(experience) : 1,
        bio: bio || '',
        approvalStatus: 'pending',
        approvalNote: 'Awaiting admin approval',
      });

      await professional.save();

      return res.status(201).json({
        success: true,
        requiresApproval: true,
        message: 'Professional registration submitted. You can login after admin approval.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          approvalStatus: user.approvalStatus,
        },
      });
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_secret_key', {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
);

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, currentCity } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedAdminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const normalizedPassword = String(password).trim();
    const normalizedAdminPassword = String(process.env.ADMIN_PASSWORD || '').trim();

    // Unified login: allow admin credentials through the same login form.
    if (
      normalizedEmail === normalizedAdminEmail &&
      normalizedPassword === normalizedAdminPassword
    ) {
      const adminToken = jwt.sign(
        {
          adminId: 'admin_001',
          email: normalizedAdminEmail,
          role: 'admin',
        },
        process.env.JWT_SECRET || 'your_secret_key',
        {
          expiresIn: process.env.JWT_EXPIRY || '7d',
        }
      );

      return res.json({
        success: true,
        token: adminToken,
        user: {
          id: 'admin_001',
          name: 'Admin',
          email: normalizedAdminEmail,
          userType: 'admin',
          approvalStatus: 'approved',
        },
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deleted by admin.',
      });
    }

    if (user.userType === 'professional' && ['pending', 'rejected'].includes(user.approvalStatus)) {
      const statusLabel = user.approvalStatus || 'pending';
      return res.status(403).json({
        success: false,
        message:
          statusLabel === 'rejected'
            ? 'Your professional account was rejected by admin. Please contact support.'
            : 'Your professional account is pending admin approval.',
        approvalStatus: statusLabel,
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update current city for professionals
    if (user.userType === 'professional' && currentCity) {
      user.currentCity = currentCity;
      await user.save();
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_secret_key', {
      expiresIn: '7d',
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        approvalStatus: user.approvalStatus,
        isDeleted: user.isDeleted,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout (client-side token removal, can also be used to blacklist tokens if needed)
router.post('/logout', authMiddleware, (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot Password - Send OTP to registered mobile number
router.post('/forgot-password', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    // Check if mobile number is registered
    const user = await User.findOne({ phone: mobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Number Not Registered'
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Delete any existing OTP for this mobile number
    await OTP.deleteMany({ mobile });

    // Save new OTP
    const otpRecord = new OTP({
      mobile,
      otp,
    });
    await otpRecord.save();

    // Send SMS with OTP
    const message = `KLPro Company: Dear User, your verification code to log in is ${otp}. For security reasons, please do not share it with anyone. Thank you!\nhttps://www.klpro.company/`;
    const smsResult = await sendSMS(mobile, message);

    // Log full SMS result for debugging
    console.log('Forgot-password SMS result:', smsResult);

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      return res.status(502).json({
        success: false,
        message: 'Failed to send OTP via SMS gateway',
        error: smsResult.error,
        data: smsResult.data || null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your registered mobile number'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request',
      error: error.message
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and OTP are required'
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ mobile, otp });

    if (!otpRecord) {
      // Increment attempts
      const failedAttempt = await OTP.findOne({ mobile });
      if (failedAttempt) {
        failedAttempt.attempts += 1;
        await failedAttempt.save();

        if (failedAttempt.attempts >= failedAttempt.maxAttempts) {
          await OTP.deleteOne({ _id: failedAttempt._id });
          return res.status(401).json({
            success: false,
            message: 'Maximum OTP attempts exceeded. Please request a new OTP'
          });
        }

        return res.status(401).json({
          success: false,
          message: `Invalid OTP. ${failedAttempt.maxAttempts - failedAttempt.attempts} attempts remaining`
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid OTP or OTP expired'
      });
    }

    // Generate a reset token
    const resetToken = jwt.sign(
      { mobile, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '15m' }
    );

    // Delete OTP after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
});

// Reset Password with OTP
router.post('/reset-password-otp', async (req, res) => {
  try {
    const { mobile, newPassword, resetToken } = req.body;

    if (!mobile || !newPassword || !resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number, new password, and reset token are required'
      });
    }

    // Verify reset token
    try {
      const decoded = jwt.verify(
        resetToken,
        process.env.JWT_SECRET || 'your_jwt_secret'
      );

      if (decoded.purpose !== 'password-reset' || decoded.mobile !== mobile) {
        return res.status(401).json({
          success: false,
          message: 'Invalid reset token'
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Reset token expired. Please request a new OTP'
      });
    }

    // Find user by mobile number
    const user = await User.findOne({ phone: mobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
});

module.exports = router;
