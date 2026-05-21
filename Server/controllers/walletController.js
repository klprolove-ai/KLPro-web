const ProfessionalWallet = require('../models/ProfessionalWallet');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');
const Refund = require('../models/Refund');
const Professional = require('../models/Professional');
const User = require('../models/User');
const Booking = require('../models/Booking');
const AdminWallet = require('../models/AdminWallet');

// ============ PROFESSIONAL WALLET OPERATIONS ============

// Get professional wallet details
exports.getWalletDetails = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find professional record
    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    // Get wallet
    let wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
    
    if (!wallet) {
      // Create wallet if not exists
      wallet = new ProfessionalWallet({
        professionalId: professional._id,
        userId,
      });
      await wallet.save();
    }

    // Calculate fee breakdown details from completed bookings
    const completedBookings = await Booking.find({
      professionalId: professional._id,
      status: 'completed'
    }).populate('serviceId');

    let totalServiceCharge = 0;
    let totalGST = 0;
    let totalPlatformCharge = 0;
    let totalCommission = 0;
    let totalPayout = 0;

    completedBookings.forEach(booking => {
      if (booking.feeBreakdown) {
        totalServiceCharge += Number(booking.feeBreakdown.totalAmount || 0);
        totalGST += Number(booking.feeBreakdown.gstAmount || 0);
        totalPlatformCharge += Number(booking.feeBreakdown.platformChargeAmount || 0);
        totalCommission += Number(booking.feeBreakdown.commissionAmount || 0);
        totalPayout += Number(booking.feeBreakdown.professionalPayoutAmount || 0);
      }
    });

    // Get transaction history
    const transactions = await Transaction.find({ 
      walletId: wallet._id 
    }).sort({ createdAt: -1 }).limit(50);

    // Get bank details
    const bankDetails = await BankDetails.findOne({ professionalId: professional._id });

    const normalizedPaymentMethods = Array.isArray(bankDetails?.paymentMethods)
      ? bankDetails.paymentMethods
          .map((method) => (typeof method === 'string' ? method : method?.methodType))
          .map((m) => {
            if (!m) return null;
            // normalize legacy 'bank' to 'bank_transfer' for frontend/backend compatibility
            if (m === 'bank') return 'bank_transfer';
            return m;
          })
          .filter(Boolean)
      : [];

    // Calculate earnings breakdown from completed bookings by date
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const earningsToday = completedBookings
      .filter(b => {
        const bookingDate = b.completedAt ? new Date(b.completedAt) : (b.updatedAt ? new Date(b.updatedAt) : null);
        return bookingDate && bookingDate >= todayStart;
      })
      .reduce((sum, b) => sum + Number(b.feeBreakdown?.professionalPayoutAmount || 0), 0);

    const earningsThisWeek = completedBookings
      .filter(b => {
        const bookingDate = b.completedAt ? new Date(b.completedAt) : (b.updatedAt ? new Date(b.updatedAt) : null);
        return bookingDate && bookingDate >= weekStart;
      })
      .reduce((sum, b) => sum + Number(b.feeBreakdown?.professionalPayoutAmount || 0), 0);

    const earningsThisMonth = completedBookings
      .filter(b => {
        const bookingDate = b.completedAt ? new Date(b.completedAt) : (b.updatedAt ? new Date(b.updatedAt) : null);
        return bookingDate && bookingDate >= monthStart;
      })
      .reduce((sum, b) => sum + Number(b.feeBreakdown?.professionalPayoutAmount || 0), 0);

    const earningsThisYear = completedBookings
      .filter(b => {
        const bookingDate = b.completedAt ? new Date(b.completedAt) : (b.updatedAt ? new Date(b.updatedAt) : null);
        return bookingDate && bookingDate >= yearStart;
      })
      .reduce((sum, b) => sum + Number(b.feeBreakdown?.professionalPayoutAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        wallet: {
          id: wallet._id,
          totalEarnings: totalPayout || wallet.totalEarnings,
          currentBalance: wallet.currentBalance || 0,
          totalWithdrawn: wallet.totalWithdrawn || 0,
          totalCommissionPaid: wallet.totalCommissionPaid || 0,
          earningsBreakdown: {
            today: earningsToday,
            thisWeek: earningsThisWeek,
            thisMonth: earningsThisMonth,
            thisYear: earningsThisYear,
          },
          status: wallet.status,
          feeBreakdownDetails: {
            totalServiceCharge,
            totalGST,
            totalPlatformCharge,
            totalCommission,
            professionalPayout: totalPayout,
          },
        },
        bankDetails: bankDetails ? {
          id: bankDetails._id,
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName,
          upiId: bankDetails.upiId,
          verificationStatus: bankDetails.verificationStatus,
          isActive: bankDetails.isActive,
          paymentMethods: normalizedPaymentMethods,
        } : null,
        recentTransactions: transactions,
      },
    });
  } catch (error) {
    console.error('Error getting wallet details:', error);
    res.status(500).json({ message: 'Error fetching wallet details', error: error.message });
  }
};

// Get earnings breakdown (daily, weekly, monthly, yearly)
exports.getEarningsReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'monthly' } = req.query; // daily, weekly, monthly, yearly

    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const day = now.getDay();
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        startDate.setMonth(0);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Get transactions for period
    const transactions = await Transaction.find({
      walletId: wallet._id,
      type: { $in: ['earning_booking', 'earning_product'] },
      status: 'completed',
      createdAt: { $gte: startDate },
    });

    const totalEarnings = transactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = transactions.length;

    const commissionTransactions = await Transaction.find({
      walletId: wallet._id,
      type: 'commission_deducted',
      status: 'completed',
      createdAt: { $gte: startDate },
    });

    const totalCommission = commissionTransactions.reduce((sum, t) => sum + t.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        totalEarnings,
        totalCommission,
        netEarnings: totalEarnings - totalCommission,
        transactionCount,
        transactions,
        breakdown: {
          bookings: transactions.filter(t => t.referenceType === 'booking').length,
          products: transactions.filter(t => t.referenceType === 'product_order').length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting earnings report:', error);
    res.status(500).json({ message: 'Error fetching earnings report', error: error.message });
  }
};

// Add or update bank details
exports.addBankDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      upiId,
      bankAccountProofUrl,
      paymentMethods = [],
    } = req.body;

    const normalizedPaymentMethods = Array.isArray(paymentMethods)
      ? paymentMethods
          .map((method) => {
            if (!method) return null;
            if (typeof method === 'string') {
              // normalize frontend 'bank_transfer' to backend enum 'bank'
              const mt = method === 'bank_transfer' ? 'bank' : method;
              return { methodType: mt, isActive: true, details: '' };
            }

            const mt = method.methodType || method.value || method.name || '';
            const normalizedMt = mt === 'bank_transfer' ? 'bank' : mt;
            return {
              methodType: normalizedMt,
              isActive: method.isActive !== false,
              details: method.details || '',
            };
          })
          .filter((method) => method && method.methodType)
      : [];

    // Validate required fields
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return res.status(400).json({ message: 'Missing required bank details' });
    }

    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    // Find or create bank details
    let bankDetails = await BankDetails.findOne({ professionalId: professional._id });

    if (bankDetails) {
      // Update existing
      bankDetails.accountHolderName = accountHolderName;
      bankDetails.accountNumber = accountNumber;
      bankDetails.ifscCode = ifscCode;
      bankDetails.bankName = bankName;
      bankDetails.branchName = branchName;
      bankDetails.upiId = upiId || bankDetails.upiId;
      bankDetails.bankAccountProofUrl = bankAccountProofUrl || bankDetails.bankAccountProofUrl;
      if (normalizedPaymentMethods.length > 0) {
        bankDetails.paymentMethods = normalizedPaymentMethods;
      }
      bankDetails.verificationStatus = 'pending'; // Reset to pending for re-verification
    } else {
      // Create new
      bankDetails = new BankDetails({
        professionalId: professional._id,
        userId,
        accountHolderName,
        accountNumber,
        ifscCode,
        bankName,
        branchName,
        upiId,
        bankAccountProofUrl,
        paymentMethods: normalizedPaymentMethods,
      });
    }

    await bankDetails.save();

    res.status(200).json({
      success: true,
      message: 'Bank details saved successfully',
      data: bankDetails,
    });
  } catch (error) {
    console.error('Error adding bank details:', error);
    res.status(500).json({ message: 'Error saving bank details', error: error.message });
  }
};

// Get bank details
exports.getBankDetails = async (req, res) => {
  try {
    const userId = req.user._id;

    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const bankDetails = await BankDetails.findOne({ professionalId: professional._id });

    const normalizedPaymentMethods = Array.isArray(bankDetails?.paymentMethods)
      ? bankDetails.paymentMethods
          .map((method) => (typeof method === 'string' ? method : method?.methodType))
          .map((m) => (m === 'bank' ? 'bank_transfer' : m))
          .filter(Boolean)
      : [];

    res.status(200).json({
      success: true,
      data: bankDetails ? {
        ...bankDetails.toObject(),
        paymentMethods: normalizedPaymentMethods,
      } : null,
    });
  } catch (error) {
    console.error('Error getting bank details:', error);
    res.status(500).json({ message: 'Error fetching bank details', error: error.message });
  }
};

// Initiate withdrawal
exports.initiateWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, withdrawalMethod, bankDetailsId } = req.body;

    // Validate and convert amount to number
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    if (!withdrawalMethod) {
      return res.status(400).json({ message: 'Withdrawal method is required' });
    }

    const minAmount = parseInt(process.env.WITHDRAWAL_MINIMUM_AMOUNT) || 100;
    if (parsedAmount < minAmount) {
      return res.status(400).json({ 
        message: `Minimum withdrawal amount is ₹${minAmount}` 
      });
    }

    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const currentBalance = wallet.currentBalance || 0;
    if (currentBalance < parsedAmount) {
      return res.status(400).json({ 
        message: 'Insufficient balance for withdrawal',
        availableBalance: currentBalance,
        requestedAmount: parsedAmount,
      });
    }

    // Get bank / UPI details when required
    let bankDetails = null;
    if (['bank_transfer', 'net_banking', 'upi'].includes(withdrawalMethod)) {
      try {
        // Allow bankDetailsId or fall back to professional's saved bank details
        if (bankDetailsId) {
          bankDetails = await BankDetails.findById(bankDetailsId);
        } else {
          bankDetails = await BankDetails.findOne({ professionalId: professional._id });
        }

        if (!bankDetails || bankDetails.verificationStatus !== 'verified') {
          return res.status(400).json({ 
            message: 'Bank/UPI details not verified. Please verify your account first.' 
          });
        }

        // For UPI withdrawals ensure upiId exists
        if (withdrawalMethod === 'upi' && !bankDetails.upiId) {
          return res.status(400).json({ message: 'No UPI ID found. Please add your UPI ID in bank details.' });
        }
      } catch (bankErr) {
        console.error('Error fetching bank details:', bankErr);
        return res.status(400).json({ 
          message: 'Error verifying bank details. Please try again.' 
        });
      }
    }

    // Create withdrawal transaction with proper data types
    const balanceBefore = currentBalance;
    const balanceAfter = currentBalance - parsedAmount;

    const transaction = new Transaction({
      walletId: wallet._id,
      professionalId: professional._id,
      userId,
      type: 'withdrawal_initiated',
      amount: parsedAmount,
      status: 'pending', // Changed to 'pending' for admin approval
      description: `Withdrawal of ₹${parsedAmount} via ${withdrawalMethod}`,
      referenceType: 'withdrawal',
      paymentMethod: 'wallet_credit', // Funds coming from wallet
      balanceBefore,
      balanceAfter,
      withdrawalDetails: {
        method: withdrawalMethod,
        bankDetailsId: bankDetailsId || null,
      },
    });

    // Validate transaction before saving
    const validationErr = transaction.validateSync();
    if (validationErr) {
      console.error('Transaction validation error:', validationErr);
      return res.status(400).json({ 
        message: 'Invalid withdrawal data', 
        error: validationErr.message 
      });
    }

    await transaction.save();

    // Deduct from wallet immediately
    wallet.currentBalance = balanceAfter;
    wallet.totalWithdrawn = (wallet.totalWithdrawn || 0) + parsedAmount;
    wallet.lastTransaction = transaction._id;
    
    const saveErr = wallet.validateSync();
    if (saveErr) {
      console.error('Wallet validation error:', saveErr);
      return res.status(400).json({ 
        message: 'Error updating wallet', 
        error: saveErr.message 
      });
    }
    
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted and pending admin approval',
      data: {
        transactionId: transaction._id,
        amount: parsedAmount,
        method: withdrawalMethod,
        status: 'pending',
        estimatedTime: 'Pending admin review',
      },
    });
  } catch (error) {
    console.error('Error initiating withdrawal:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error initiating withdrawal', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 20, skip = 0 } = req.query;

    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const query = {
      walletId: wallet._id,
      type: { $in: ['withdrawal_initiated', 'withdrawal_completed', 'withdrawal_failed'] },
    };

    if (status) {
      query.status = status;
    }

    const total = await Transaction.countDocuments(query);
    const withdrawals = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('withdrawalDetails.bankDetailsId');

    res.status(200).json({
      success: true,
      data: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        withdrawals,
      },
    });
  } catch (error) {
    console.error('Error getting withdrawal history:', error);
    res.status(500).json({ message: 'Error fetching withdrawal history', error: error.message });
  }
};

// Get transaction history
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, status, limit = 50, skip = 0 } = req.query;

    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const query = { walletId: wallet._id };

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.status(200).json({
      success: true,
      data: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        transactions,
      },
    });
  } catch (error) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({ message: 'Error fetching transaction history', error: error.message });
  }
};

// Get refund visibility for users (user-facing)
exports.getUserRefunds = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 20, skip = 0 } = req.query;

    const query = {
      userId,
      visibleToUser: true,
    };

    if (status) {
      query.status = status;
    }

    const total = await Refund.countDocuments(query);
    const refunds = await Refund.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('paymentId')
      .populate('referenceId');

    res.status(200).json({
      success: true,
      data: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        refunds,
      },
    });
  } catch (error) {
    console.error('Error getting user refunds:', error);
    res.status(500).json({ message: 'Error fetching refunds', error: error.message });
  }
};

// ============ WALLET FUND MANAGEMENT ============

// Professional adds funds to wallet
exports.addFundsToWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, paymentMethod, transactionReference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    let wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
    if (!wallet) {
      wallet = new ProfessionalWallet({
        professionalId: professional._id,
        userId,
      });
    }

    const balanceBefore = wallet.currentBalance;
    wallet.currentBalance += amount;
    wallet.totalEarnings += amount;
    await wallet.save();

    // Create transaction record
    const transaction = new Transaction({
      walletId: wallet._id,
      professionalId: professional._id,
      userId,
      type: 'manual_credit',
      amount,
      status: 'completed',
      description: `Wallet top-up of ${amount} via ${paymentMethod}`,
      referenceType: 'manual',
      paymentMethod: paymentMethod === 'upi' ? 'upi' : paymentMethod === 'net_banking' ? 'net_banking' : 'cash',
      balanceBefore,
      balanceAfter: wallet.currentBalance,
      completedAt: new Date(),
    });

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Funds added to wallet successfully',
      data: {
        transactionId: transaction._id,
        amount,
        newBalance: wallet.currentBalance,
        balanceBefore,
      },
    });
  } catch (error) {
    console.error('Error adding funds to wallet:', error);
    res.status(500).json({ message: 'Error adding funds', error: error.message });
  }
};

// Admin deducts commission from professional wallet
exports.deductCommissionFromWallet = async (req, res) => {
  try {
    const { professionalId, amount, reason, referenceId } = req.body;

    if (!professionalId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid professional ID or amount' });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    let wallet = await ProfessionalWallet.findOne({ professionalId });
    if (!wallet) {
      wallet = new ProfessionalWallet({
        professionalId,
        userId: professional.userId,
      });
      await wallet.save();
    }

    if (wallet.currentBalance < amount) {
      return res.status(400).json({
        message: 'Insufficient wallet balance for deduction',
        availableBalance: wallet.currentBalance,
        requestedAmount: amount,
      });
    }

    const balanceBefore = wallet.currentBalance;
    wallet.currentBalance -= amount;
    wallet.totalCommissionPaid += amount;
    await wallet.save();

    // Create transaction record for professional
    const transaction = new Transaction({
      walletId: wallet._id,
      professionalId,
      userId: professional.userId,
      type: 'commission_deducted',
      amount,
      status: 'completed',
      description: reason || 'Commission deduction by admin',
      referenceType: 'admin_deduction',
      referenceId: referenceId || null,
      balanceBefore,
      balanceAfter: wallet.currentBalance,
      completedAt: new Date(),
    });

    await transaction.save();

    // Also update admin wallet to credit the amount
    let adminWallet = await AdminWallet.findOne();
    if (!adminWallet) {
      adminWallet = new AdminWallet();
    }
    adminWallet.totalBalance += amount;
    adminWallet.totalCommissionReceived += amount;
    await adminWallet.save();

    res.status(200).json({
      success: true,
      message: 'Commission deducted successfully',
      data: {
        transactionId: transaction._id,
        amount,
        newBalance: wallet.currentBalance,
        balanceBefore,
        reason,
        professionalName: professional.name || 'Professional',
      },
    });
  } catch (error) {
    console.error('Error deducting commission:', error);
    res.status(500).json({ message: 'Error deducting commission', error: error.message });
  }
};

module.exports = exports;
