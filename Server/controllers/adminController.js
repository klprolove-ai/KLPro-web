const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Professional = require('../models/Professional');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const Refund = require('../models/Refund');
const BankDetails = require('../models/BankDetails');
const ProfessionalWallet = require('../models/ProfessionalWallet');
const ProductOrder = require('../models/ProductOrder');
const Review = require('../models/Review');
const OTP = require('../models/OTP');
const Contact = require('../models/Contact');
const { endCallSession } = require('../services/callSessionService');
const { emitToUser, emitToAdmins } = require('../realtime/presence');

// Admin Login
const adminLogin = (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedAdminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const normalizedPassword = String(password).trim();
    const normalizedAdminPassword = String(process.env.ADMIN_PASSWORD || '').trim();

    // Primary admin auth using environment credentials.
    if (normalizedEmail === normalizedAdminEmail && normalizedPassword === normalizedAdminPassword) {
      const token = jwt.sign(
        {
          adminId: 'admin_001',
          email: normalizedAdminEmail,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRY || '7d'
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        admin: {
          email: normalizedAdminEmail,
          role: 'admin'
        }
      });
    }

    // Fallback admin auth using DB users with userType=admin.
    return User.findOne({ email: normalizedEmail })
      .select('+password')
      .then(async (adminUser) => {
        if (!adminUser || adminUser.userType !== 'admin') {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        const isPasswordCorrect = await bcrypt.compare(normalizedPassword, adminUser.password);
        if (!isPasswordCorrect) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        const token = jwt.sign(
          {
            adminId: String(adminUser._id),
            email: adminUser.email,
            role: 'admin'
          },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.JWT_EXPIRY || '7d'
          }
        );

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          token,
          admin: {
            email: adminUser.email,
            role: 'admin'
          }
        });
      })
      .catch((dbError) => {
        console.error('Admin DB login error:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Server error during login',
          error: dbError.message
        });
      });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// Admin Logout
const adminLogout = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

// Get Admin Profile
const getAdminProfile = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      admin: {
        email: req.admin.email,
        role: req.admin.role
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: error.message
    });
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } }).select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      error: error.message
    });
  }
};

// Get User by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user',
      error: error.message
    });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const { name, email, phone, address, city, userType, isVerified } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, address, city, userType, isVerified },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user',
      error: error.message
    });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = user._id;
    const userEmail = String(user.email || '').trim().toLowerCase();
    const userPhone = String(user.phone || '').trim();

    // Find all professionals linked to this user
    const professionals = await Professional.find({ userId });
    const professionalIds = professionals.map(p => p._id);

    const bookingQuery = professionalIds.length > 0
      ? { $or: [{ customerId: userId }, { professionalId: { $in: professionalIds } }] }
      : { customerId: userId };

    const paymentQuery = professionalIds.length > 0
      ? { $or: [{ userId }, { professionalId: { $in: professionalIds } }] }
      : { userId };

    const refundQuery = professionalIds.length > 0
      ? { $or: [{ userId }, { professionalId: { $in: professionalIds } }] }
      : { userId };

    const bankDetailsQuery = professionalIds.length > 0
      ? { $or: [{ userId }, { professionalId: { $in: professionalIds } }] }
      : { userId };

    const transactionQuery = professionalIds.length > 0
      ? { $or: [{ userId }, { professionalId: { $in: professionalIds } }] }
      : { userId };

    const professionalWalletQuery = professionalIds.length > 0
      ? { $or: [{ userId }, { professionalId: { $in: professionalIds } }] }
      : { userId };

    const deletionTasks = [
      // Hard delete User
      User.findByIdAndDelete(userId),
      
      // Hard delete all Reviews
      Review.deleteMany({ $or: [{ reviewer: userId }, { professional: userId }] }),
      
      // Hard delete all Bookings
      Booking.deleteMany(bookingQuery),
      
      // Hard delete all Payments
      Payment.deleteMany(paymentQuery),
      
      // Hard delete all Refunds
      Refund.deleteMany(refundQuery),
      
      // Hard delete all BankDetails
      BankDetails.deleteMany(bankDetailsQuery),
      
      // Hard delete all Transactions
      Transaction.deleteMany(transactionQuery),
      
      // Hard delete all ProfessionalWallets
      ProfessionalWallet.deleteMany(professionalWalletQuery),
      
      // Hard delete all ProductOrders
      ProductOrder.deleteMany({ customerId: userId }),
      
      // Hard delete all Professionals (no soft delete - direct delete)
      Professional.deleteMany({ userId: userId }),
    ];

    // Handle Contact deletion
    const contactConditions = [];
    if (userEmail) contactConditions.push({ email: userEmail });
    if (userPhone) contactConditions.push({ phone: userPhone });
    if (contactConditions.length > 0) {
      deletionTasks.push(Contact.deleteMany({ $or: contactConditions }));
    }

    // Handle OTP deletion
    if (userPhone) {
      deletionTasks.push(OTP.deleteMany({ mobile: userPhone }));
    }

    // Execute all deletions in parallel
    const results = await Promise.all(deletionTasks);

    console.log(`Successfully deleted user ${userId} and all associated data:`, {
      userDeleted: !!results[0],
      reviewsDeleted: results[1].deletedCount,
      bookingsDeleted: results[2].deletedCount,
      paymentsDeleted: results[3].deletedCount,
      refundsDeleted: results[4].deletedCount,
      bankDetailsDeleted: results[5].deletedCount,
      transactionsDeleted: results[6].deletedCount,
      professionalWalletsDeleted: results[7].deletedCount,
      productOrdersDeleted: results[8].deletedCount,
      professionalsDeleted: results[9].deletedCount,
    });

    res.status(200).json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user',
      error: error.message
    });
  }
};

// Get User Statistics
const getUserStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const customers = await User.countDocuments({ userType: 'customer' });
    const professionals = await User.countDocuments({ userType: 'professional' });
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    res.status(200).json({
      success: true,
      statistics: {
        totalUsers,
        customers,
        professionals,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message
    });
  }
};

// Get professional applications for admin review
const getProfessionalApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.approvalStatus = status;
    }

    const applications = await Professional.find(filter)
      .populate('userId', 'name email phone city userType approvalStatus isVerified')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error('Get professional applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching professional applications',
      error: error.message,
    });
  }
};

const buildVerificationSchedule = (verificationDate, verificationTime) => {
  if (!verificationDate || !verificationTime) {
    return null;
  }

  const scheduledAt = new Date(`${verificationDate}T${verificationTime}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  return scheduledAt;
};

const formatVerificationLabel = (scheduledAt, fallbackTime) => {
  if (!scheduledAt) {
    return fallbackTime || 'Soon';
  }

  return scheduledAt.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

// Approve or reject professional application
const reviewProfessionalApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, stage, verificationDate, verificationTime, verificationMeetingLink } = req.body;

    const normalizedStage = String(stage || '').trim().toLowerCase() || 'initial';

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected',
      });
    }

    const professional = await Professional.findById(id);
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Professional application not found',
      });
    }

    const user = await User.findById(professional.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Professional account not found',
      });
    }

    const adminEmail = req.admin?.email || '';
    let notificationMessage = '';

    if (normalizedStage === 'final') {
      if (professional.verificationStatus !== 'scheduled') {
        return res.status(409).json({
          success: false,
          message: 'Final review is only available after a scheduled video verification',
        });
      }

      if (status === 'approved') {
        professional.verificationStatus = 'completed';
        professional.verificationCompletedAt = new Date();
        professional.approvalNote = note || professional.approvalNote || 'Video verification approved';
        notificationMessage = 'Video verification completed. This professional is now visible to customers.';

        user.approvalStatus = 'approved';
        user.verificationStatus = 'completed';
        user.approvalNote = note || 'Video verification approved';
        user.isVerified = true;
      } else {
        professional.verificationStatus = 'rejected';
        professional.approvalStatus = 'rejected';
        professional.approvalNote = note || 'Video verification rejected';
        professional.verificationNotification = 'Video verification rejected. Account suspended.';
        notificationMessage = professional.verificationNotification;

        user.approvalStatus = 'rejected';
        user.verificationStatus = 'rejected';
        user.approvalNote = note || 'Video verification rejected';
        user.isVerified = false;
      }

      endCallSession('kyc', professional._id, {
        reason: `kyc-${status}`,
        endedBy: adminEmail || 'admin',
      });
    } else {
      if (status === 'approved') {
        const scheduledAt = buildVerificationSchedule(verificationDate, verificationTime);
        if (!scheduledAt) {
          return res.status(400).json({
            success: false,
            message: 'Verification date and time are required when approving and scheduling KYC',
          });
        }

        professional.approvalStatus = 'approved';
        professional.verificationStatus = 'scheduled';
        professional.verificationScheduledAt = scheduledAt;
        professional.verificationScheduledTime = verificationTime;
        professional.verificationMeetingLink = String(verificationMeetingLink || '').trim();
        professional.approvalNote = note || 'Approved and scheduled for video verification';
        notificationMessage = `Video verification scheduled for ${formatVerificationLabel(scheduledAt, verificationTime)}.`;

        user.approvalStatus = 'approved';
        user.verificationStatus = 'scheduled';
        user.approvalNote = note || 'Approved and scheduled for video verification';
        user.isVerified = false;
      } else {
        professional.approvalStatus = 'rejected';
        professional.verificationStatus = 'rejected';
        professional.approvalNote = note || 'Application rejected by admin';
        notificationMessage = 'Your professional registration has been rejected by admin.';

        user.approvalStatus = 'rejected';
  user.verificationStatus = 'rejected';
        user.approvalNote = note || 'Application rejected by admin';
        user.isVerified = false;

        endCallSession('kyc', professional._id, {
          reason: `application-${status}`,
          endedBy: adminEmail || 'admin',
        });
      }
    }

    professional.reviewedByAdminEmail = adminEmail;
    professional.reviewedAt = new Date();
    professional.verificationNotification = notificationMessage || professional.verificationNotification || '';
    await professional.save();
    await user.save();

    const populatedUser = await User.findById(user._id).select('-password');

    emitToUser(String(user._id), 'professional-verification-updated', {
      professionalId: String(professional._id),
      userId: String(user._id),
      stage: normalizedStage,
      status,
      approvalStatus: professional.approvalStatus,
      verificationStatus: professional.verificationStatus,
      notificationMessage: professional.verificationNotification,
      verificationScheduledAt: professional.verificationScheduledAt,
      verificationScheduledTime: professional.verificationScheduledTime,
    });

    emitToAdmins('professional-verification-updated', {
      professionalId: String(professional._id),
      professionalName: user.name || 'Professional',
      stage: normalizedStage,
      status,
      approvalStatus: professional.approvalStatus,
      verificationStatus: professional.verificationStatus,
      notificationMessage: professional.verificationNotification,
      verificationScheduledAt: professional.verificationScheduledAt,
      verificationScheduledTime: professional.verificationScheduledTime,
    });

    res.status(200).json({
      success: true,
      message: `Professional application ${status} successfully`,
      professional,
      user: populatedUser,
    });
  } catch (error) {
    console.error('Review professional application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error reviewing professional application',
      error: error.message,
    });
  }
};

module.exports = {
  adminLogin,
  adminLogout,
  getAdminProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStatistics,
  getProfessionalApplications,
  reviewProfessionalApplication,
};
