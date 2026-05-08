const ProfessionalWallet = require('../models/ProfessionalWallet');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');
const Refund = require('../models/Refund');
const Professional = require('../models/Professional');
const User = require('../models/User');
const Booking = require('../models/Booking');

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

    // Get transaction history
    const transactions = await Transaction.find({ 
      walletId: wallet._id 
    }).sort({ createdAt: -1 }).limit(50);

    // Get bank details
    const bankDetails = await BankDetails.findOne({ professionalId: professional._id });

    res.status(200).json({
      success: true,
      data: {
        wallet: {
          id: wallet._id,
          totalEarnings: wallet.totalEarnings,
          currentBalance: wallet.currentBalance,
          totalWithdrawn: wallet.totalWithdrawn,
          totalCommissionPaid: wallet.totalCommissionPaid,
          earningsBreakdown: wallet.earningsBreakdown,
          status: wallet.status,
        },
        bankDetails: bankDetails ? {
          id: bankDetails._id,
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName,
          upiId: bankDetails.upiId,
          verificationStatus: bankDetails.verificationStatus,
          isActive: bankDetails.isActive,
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
    } = req.body;

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

    res.status(200).json({
      success: true,
      data: bankDetails || null,
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

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    const minAmount = parseInt(process.env.WITHDRAWAL_MINIMUM_AMOUNT) || 100;
    if (amount < minAmount) {
      return res.status(400).json({ 
        message: `Minimum withdrawal amount is ${minAmount}` 
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

    if (wallet.currentBalance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient balance for withdrawal',
        availableBalance: wallet.currentBalance,
        requestedAmount: amount,
      });
    }

    // Get bank details
    let bankDetails = null;
    if (withdrawalMethod === 'bank_transfer' || withdrawalMethod === 'net_banking') {
      bankDetails = await BankDetails.findById(bankDetailsId);
      if (!bankDetails || bankDetails.verificationStatus !== 'verified') {
        return res.status(400).json({ 
          message: 'Bank details not verified. Please verify your bank account first.' 
        });
      }
    }

    // Create withdrawal transaction
    const transaction = new Transaction({
      walletId: wallet._id,
      professionalId: professional._id,
      userId,
      type: 'withdrawal_initiated',
      amount,
      status: 'processing',
      description: `Withdrawal of ${amount} via ${withdrawalMethod}`,
      referenceType: 'withdrawal',
      paymentMethod: withdrawalMethod,
      balanceBefore: wallet.currentBalance,
      balanceAfter: wallet.currentBalance - amount,
      withdrawalDetails: {
        method: withdrawalMethod,
        bankDetailsId: bankDetailsId || null,
      },
    });

    await transaction.save();

    // Deduct from wallet immediately
    wallet.currentBalance -= amount;
    wallet.lastTransaction = transaction._id;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal initiated successfully',
      data: {
        transactionId: transaction._id,
        amount,
        method: withdrawalMethod,
        status: 'processing',
        estimatedTime: '2-3 business days',
      },
    });
  } catch (error) {
    console.error('Error initiating withdrawal:', error);
    res.status(500).json({ message: 'Error initiating withdrawal', error: error.message });
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

module.exports = exports;
