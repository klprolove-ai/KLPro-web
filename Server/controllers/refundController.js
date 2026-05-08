const Razorpay = require('razorpay');
const Refund = require('../models/Refund');
const Payment = require('../models/Payment');
const ProfessionalWallet = require('../models/ProfessionalWallet');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const Professional = require('../models/Professional');

// Lazy initialize Razorpay - only when needed
let razorpay = null;
const getRazorpayInstance = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('Razorpay credentials not configured in environment variables');
      return null;
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// ============ REFUND OPERATIONS ============

// Request refund (user-initiated)
exports.requestRefund = async (req, res) => {
  try {
    const userId = req.user._id;
    const { paymentId, reason, description } = req.body;

    if (!paymentId || !reason || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get payment details
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ message: 'Payment already refunded' });
    }

    // Create refund request
    const refund = new Refund({
      paymentId,
      userId,
      amount: payment.amount,
      reason,
      description,
      status: 'pending',
      referenceType: payment.referenceType,
      referenceId: payment.referenceId,
      professionalId: payment.professionalId,
      visibleToUser: true,
    });

    await refund.save();

    res.status(201).json({
      success: true,
      message: 'Refund request submitted successfully',
      data: {
        refundId: refund._id,
        status: refund.status,
        amount: refund.amount,
        estimatedProcessingTime: '2-5 business days',
      },
    });
  } catch (error) {
    console.error('Error requesting refund:', error);
    res.status(500).json({ message: 'Error requesting refund', error: error.message });
  }
};

// Get user refunds with visibility
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
      .populate({
        path: 'paymentId',
        select: 'amount paymentMethod referenceType referenceId',
      });

    res.status(200).json({
      success: true,
      data: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        refunds: refunds.map(r => ({
          id: r._id,
          paymentId: r.paymentId._id,
          amount: r.amount,
          reason: r.reason,
          description: r.description,
          status: r.status,
          createdAt: r.createdAt,
          completedAt: r.completedAt,
          refundMethod: r.refundMethod,
          paymentMethod: r.paymentId?.paymentMethod,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting user refunds:', error);
    res.status(500).json({ message: 'Error fetching refunds', error: error.message });
  }
};

// Get refund details
exports.getRefundDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { refundId } = req.params;

    const refund = await Refund.findById(refundId)
      .populate('paymentId')
      .populate('approvedBy', 'name email');

    if (!refund) {
      return res.status(404).json({ message: 'Refund not found' });
    }

    if (refund.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    console.error('Error getting refund details:', error);
    res.status(500).json({ message: 'Error fetching refund details', error: error.message });
  }
};

// ============ ADMIN REFUND OPERATIONS ============

// Approve refund (admin)
exports.approveRefund = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { refundId, refundMethod, approvalNotes } = req.body;

    if (!refundId) {
      return res.status(400).json({ message: 'Refund ID is required' });
    }

    const refund = await Refund.findById(refundId).populate('paymentId');
    if (!refund) {
      return res.status(404).json({ message: 'Refund not found' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ message: 'Refund is not in pending status' });
    }

    refund.status = 'approved';
    refund.approvedBy = adminId;
    refund.approvalNotes = approvalNotes || '';
    refund.approvedAt = new Date();
    refund.refundMethod = refundMethod || 'original_payment_method';

    await refund.save();

    // Process actual refund
    await processRefund(refund);

    res.status(200).json({
      success: true,
      message: 'Refund approved successfully',
      data: {
        refundId: refund._id,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('Error approving refund:', error);
    res.status(500).json({ message: 'Error approving refund', error: error.message });
  }
};

// Reject refund (admin)
exports.rejectRefund = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { refundId, rejectionReason } = req.body;

    const refund = await Refund.findById(refundId);
    if (!refund) {
      return res.status(404).json({ message: 'Refund not found' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ message: 'Refund is not in pending status' });
    }

    refund.status = 'rejected';
    refund.approvedBy = adminId;
    refund.approvalNotes = rejectionReason || 'Rejected by admin';
    refund.approvedAt = new Date();

    await refund.save();

    // Notify user
    refund.userNotified = true;
    await refund.save();

    res.status(200).json({
      success: true,
      message: 'Refund rejected',
      data: {
        refundId: refund._id,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('Error rejecting refund:', error);
    res.status(500).json({ message: 'Error rejecting refund', error: error.message });
  }
};

// ============ REFUND PROCESSING ============

async function processRefund(refund) {
  try {
    const payment = await Payment.findById(refund.paymentId);
    if (!payment) {
      console.error('Payment not found for refund:', refund._id);
      return;
    }

    if (payment.paymentMethod === 'razorpay' && payment.razorpayPaymentId) {
      // Process Razorpay refund
      const rzpInstance = getRazorpayInstance();
      if (!rzpInstance) {
        throw new Error('Razorpay not configured');
      }
      try {
        const razorpayRefund = await rzpInstance.payments.refund(
          payment.razorpayPaymentId,
          {
            amount: refund.amount * 100, // Amount in paise
            notes: {
              refundId: refund._id.toString(),
              reason: refund.reason,
            },
          }
        );

        refund.razorpayRefundId = razorpayRefund.id;
        refund.status = 'processing';
        refund.gatewayResponse = razorpayRefund;
      } catch (error) {
        console.error('Razorpay refund error:', error);
        refund.status = 'failed';
        refund.failureReason = error.message;
        refund.failureDetails = JSON.stringify(error);
        await refund.save();
        return;
      }
    } else if (payment.paymentMethod === 'cash') {
      // Cash refund - mark as processing
      refund.status = 'processing';
    }

    // Reverse commission if applicable
    if (refund.professionalId) {
      const professional = await Professional.findById(refund.professionalId);
      if (professional) {
        const wallet = await ProfessionalWallet.findOne({ 
          professionalId: professional._id 
        });

        if (wallet && wallet.currentBalance >= refund.amount) {
          // Deduct refund from professional's wallet
          const reversalTransaction = new Transaction({
            walletId: wallet._id,
            professionalId: professional._id,
            userId: professional.userId,
            type: 'refund',
            amount: refund.amount,
            status: 'completed',
            description: `Refund for ${refund.reason}`,
            referenceType: refund.referenceType,
            referenceId: refund.referenceId,
            balanceBefore: wallet.currentBalance,
            balanceAfter: wallet.currentBalance - refund.amount,
            completedAt: new Date(),
          });

          await reversalTransaction.save();

          wallet.currentBalance -= refund.amount;
          wallet.lastTransaction = reversalTransaction._id;
          await wallet.save();

          refund.commissionReversed = Math.round(
            (refund.amount * parseInt(process.env.COMMISSION_PERCENTAGE || 10)) / 100
          );
        }
      }
    }

    // Update payment status
    payment.status = 'refunded';
    payment.refundedAmount = refund.amount;
    payment.refundReason = refund.reason;
    await payment.save();

    refund.userNotified = true;
    await refund.save();

    console.log(`Refund processed: ${refund._id}`);
  } catch (error) {
    console.error('Error processing refund:', error);
    refund.status = 'failed';
    refund.failureReason = error.message;
    await refund.save();
  }
}

// Webhook handler for Razorpay refund status updates
exports.handleRefundWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;

    if (event === 'refund.processed') {
      const refundData = payload.refund;

      // Find and update refund record
      const refund = await Refund.findOne({
        razorpayRefundId: refundData.id,
      });

      if (refund) {
        refund.status = 'completed';
        refund.completedAt = new Date();
        await refund.save();
      }
    } else if (event === 'refund.failed') {
      const refundData = payload.refund;

      const refund = await Refund.findOne({
        razorpayRefundId: refundData.id,
      });

      if (refund) {
        refund.status = 'failed';
        refund.failureReason = refundData.reason || 'Refund processing failed';
        await refund.save();
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling refund webhook:', error);
    res.status(500).json({ message: 'Error processing webhook', error: error.message });
  }
};

// Get all refunds (admin)
exports.getAllRefunds = async (req, res) => {
  try {
    const { status, reason, limit = 50, skip = 0 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (reason) query.reason = reason;

    const total = await Refund.countDocuments(query);
    const refunds = await Refund.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email phone')
      .populate('paymentId', 'amount paymentMethod')
      .populate('approvedBy', 'name email');

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
    console.error('Error getting all refunds:', error);
    res.status(500).json({ message: 'Error fetching refunds', error: error.message });
  }
};

module.exports = exports;
