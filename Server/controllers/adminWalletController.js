const AdminWallet = require('../models/AdminWallet');
const ProfessionalWallet = require('../models/ProfessionalWallet');
const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const Professional = require('../models/Professional');
const User = require('../models/User');
const Booking = require('../models/Booking');

// ============ ADMIN WALLET OPERATIONS ============

// Get admin wallet details
exports.getAdminWalletDetails = async (req, res) => {
  try {
    const adminId = req.user._id;

    let wallet = await AdminWallet.findOne({ adminId });

    if (!wallet) {
      // Create admin wallet if not exists
      wallet = new AdminWallet({
        adminId,
      });
      await wallet.save();
    }

    res.status(200).json({
      success: true,
      data: {
        totalBalance: wallet.totalBalance,
        totalCommissionReceived: wallet.totalCommissionReceived,
        totalCashCollected: wallet.totalCashCollected,
        totalPayoutsMade: wallet.totalPayoutsMade,
        commissionBreakdown: wallet.commissionBreakdown,
        cashBreakdown: wallet.cashBreakdown,
        stats: {
          totalBookings: wallet.totalBookings,
          totalProductOrders: wallet.totalProductOrders,
          totalRefunds: wallet.totalRefunds,
        },
      },
    });
  } catch (error) {
    console.error('Error getting admin wallet:', error);
    res.status(500).json({ message: 'Error fetching admin wallet', error: error.message });
  }
};

// Get commission report
exports.getCommissionReport = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      let start = new Date();
      switch (period) {
        case 'daily':
          start.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          const day = now.getDay();
          start.setDate(now.getDate() - day);
          start.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          break;
        case 'yearly':
          start.setMonth(0);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          break;
      }
      dateFilter.createdAt = { $gte: start };
    }

    // Get commission transactions
    const commissions = await Transaction.find({
      type: 'commission_deducted',
      status: 'completed',
      ...dateFilter,
    });

    const totalCommission = commissions.reduce((sum, t) => sum + t.amount, 0);

    // Get cash payments
    const cashPayments = await Payment.find({
      paymentMethod: 'cash',
      status: 'completed',
      ...dateFilter,
    });

    const totalCash = cashPayments.reduce((sum, p) => sum + p.adminAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        period,
        dateRange: {
          start: dateFilter.createdAt?.$gte || new Date(),
          end: dateFilter.createdAt?.$lte || now,
        },
        commissions: {
          total: totalCommission,
          count: commissions.length,
          average: commissions.length > 0 ? totalCommission / commissions.length : 0,
        },
        cashPayments: {
          total: totalCash,
          count: cashPayments.length,
          average: cashPayments.length > 0 ? totalCash / cashPayments.length : 0,
        },
        grandTotal: totalCommission + totalCash,
        breakdown: commissions,
      },
    });
  } catch (error) {
    console.error('Error getting commission report:', error);
    res.status(500).json({ message: 'Error fetching commission report', error: error.message });
  }
};

// Get professional earnings summary (for admin)
exports.getProfessionalEarnings = async (req, res) => {
  try {
    const { limit = 50, skip = 0, sortBy = '-totalEarnings' } = req.query;

    const wallets = await ProfessionalWallet.find()
      .sort(sortBy)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('professionalId', 'category subCategory')
      .populate('userId', 'name email phone');

    const total = await ProfessionalWallet.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        professionals: wallets,
      },
    });
  } catch (error) {
    console.error('Error getting professional earnings:', error);
    res.status(500).json({ 
      message: 'Error fetching professional earnings', 
      error: error.message 
    });
  }
};

// Manual credit to professional wallet (admin)
exports.creditProfessionalWallet = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { professionalId, amount, reason, description } = req.body;

    if (!professionalId || !amount || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
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

    // Create transaction
    const transaction = new Transaction({
      walletId: wallet._id,
      professionalId,
      userId: professional.userId,
      type: 'manual_credit',
      amount,
      status: 'completed',
      description: description || reason,
      referenceType: 'manual',
      adminId,
      adminNotes: reason,
      balanceBefore: wallet.currentBalance,
      balanceAfter: wallet.currentBalance + amount,
      completedAt: new Date(),
    });

    await transaction.save();

    wallet.currentBalance += amount;
    wallet.totalEarnings += amount;
    wallet.lastTransaction = transaction._id;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Credit added successfully',
      data: {
        professionalId,
        amount,
        newBalance: wallet.currentBalance,
        transactionId: transaction._id,
      },
    });
  } catch (error) {
    console.error('Error crediting wallet:', error);
    res.status(500).json({ message: 'Error crediting wallet', error: error.message });
  }
};

// Manual debit from professional wallet (admin)
exports.debitProfessionalWallet = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { professionalId, amount, reason, description } = req.body;

    if (!professionalId || !amount || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const wallet = await ProfessionalWallet.findOne({ professionalId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (wallet.currentBalance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient balance',
        currentBalance: wallet.currentBalance,
        requestedAmount: amount,
      });
    }

    // Create transaction
    const transaction = new Transaction({
      walletId: wallet._id,
      professionalId,
      userId: wallet.userId,
      type: 'manual_debit',
      amount,
      status: 'completed',
      description: description || reason,
      referenceType: 'manual',
      adminId,
      adminNotes: reason,
      balanceBefore: wallet.currentBalance,
      balanceAfter: wallet.currentBalance - amount,
      completedAt: new Date(),
    });

    await transaction.save();

    wallet.currentBalance -= amount;
    wallet.lastTransaction = transaction._id;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Debit completed successfully',
      data: {
        professionalId,
        amount,
        newBalance: wallet.currentBalance,
        transactionId: transaction._id,
      },
    });
  } catch (error) {
    console.error('Error debiting wallet:', error);
    res.status(500).json({ message: 'Error debiting wallet', error: error.message });
  }
};

// Suspend/Freeze professional wallet (admin)
exports.suspendProfessionalWallet = async (req, res) => {
  try {
    const { professionalId, reason } = req.body;

    if (!professionalId || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const wallet = await ProfessionalWallet.findOne({ professionalId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.status = 'suspended';
    wallet.suspensionReason = reason;
    wallet.suspendedAt = new Date();
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Professional wallet suspended',
      data: {
        professionalId,
        status: wallet.status,
        reason: wallet.suspensionReason,
      },
    });
  } catch (error) {
    console.error('Error suspending wallet:', error);
    res.status(500).json({ message: 'Error suspending wallet', error: error.message });
  }
};

// Reactivate professional wallet (admin)
exports.reactivateProfessionalWallet = async (req, res) => {
  try {
    const { professionalId } = req.body;

    if (!professionalId) {
      return res.status(400).json({ message: 'Professional ID is required' });
    }

    const wallet = await ProfessionalWallet.findOne({ professionalId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.status = 'active';
    wallet.suspensionReason = '';
    wallet.suspendedAt = null;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Professional wallet reactivated',
      data: {
        professionalId,
        status: wallet.status,
      },
    });
  } catch (error) {
    console.error('Error reactivating wallet:', error);
    res.status(500).json({ message: 'Error reactivating wallet', error: error.message });
  }
};

// Get transaction report
exports.getTransactionReport = async (req, res) => {
  try {
    const { type, status, startDate, endDate, limit = 100, skip = 0 } = req.query;

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('professionalId', 'category subCategory')
      .populate('userId', 'name email');

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
    console.error('Error getting transaction report:', error);
    res.status(500).json({ message: 'Error fetching transaction report', error: error.message });
  }
};

// Get payment analytics (admin dashboard)
exports.getPaymentAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Current month stats
    const currentMonthPayments = await Payment.find({
      status: 'completed',
      createdAt: { $gte: thisMonth },
    });

    // Last month stats
    const lastMonthPayments = await Payment.find({
      status: 'completed',
      createdAt: { $gte: lastMonth, $lt: thisMonth },
    });

    const currentMonthTotal = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const lastMonthTotal = lastMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyGrowth = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 100;

    // Payment method breakdown
    const paymentMethodStats = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]);

    // Top professionals
    const topProfessionals = await Transaction.aggregate([
      { $match: { type: 'earning_booking', status: 'completed' } },
      { $group: { _id: '$professionalId', totalEarnings: { $sum: '$amount' } } },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'professionals', localField: '_id', foreignField: '_id', as: 'professional' } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          currentMonthTotal,
          lastMonthTotal,
          monthlyGrowth: monthlyGrowth.toFixed(2),
        },
        paymentMethods: paymentMethodStats,
        topProfessionals,
      },
    });
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

module.exports = exports;
