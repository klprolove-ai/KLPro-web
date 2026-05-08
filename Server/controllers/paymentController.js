const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const ProductOrder = require('../models/ProductOrder');
const ProfessionalWallet = require('../models/ProfessionalWallet');
const Transaction = require('../models/Transaction');
const Refund = require('../models/Refund');
const Booking = require('../models/Booking');
const Professional = require('../models/Professional');
const User = require('../models/User');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const COMMISSION_PERCENTAGE = parseInt(process.env.COMMISSION_PERCENTAGE) || 10;

const normalizePaymentMethod = (value) => {
  const method = String(value || '').trim().toLowerCase();
  if (method === 'online') return 'razorpay';
  if (method === 'card' || method === 'upi' || method === 'wallet_credit' || method === 'cash') return method;
  return 'razorpay';
};

// ============ PAYMENT CREATION ============

// Create Razorpay order for booking
exports.createOrderForBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookingId, paymentMethod } = req.body;
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId).populate('professionalId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking status does not allow payment' });
    }

    // Calculate commission and amounts
    const bookingAmount = booking.price;
    const commissionAmount = Math.round((bookingAmount * COMMISSION_PERCENTAGE) / 100);
    const professionalAmount = bookingAmount - commissionAmount;

    // Create payment record
    const payment = new Payment({
      userId,
      amount: bookingAmount,
      paymentMethod: normalizedPaymentMethod,
      referenceType: 'booking',
      referenceId: bookingId,
      status: 'initiated',
      professionalId: booking.professionalId._id,
      commissionAmount,
      commissionPercentage: COMMISSION_PERCENTAGE,
      professionalAmount,
      adminAmount: commissionAmount,
      description: `Payment for booking #${bookingId}`,
    });

    if (normalizedPaymentMethod === 'razorpay') {
      try {
        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
          amount: bookingAmount * 100, // Razorpay expects amount in paise
          currency: 'INR',
          receipt: `booking_${bookingId}_${Date.now()}`,
          notes: {
            bookingId,
            customerId: userId.toString(),
            professionalId: booking.professionalId._id.toString(),
          },
        });

        payment.razorpayOrderId = razorpayOrder.id;
        payment.status = 'pending';
      } catch (error) {
        console.error('Razorpay order creation error:', error);
        return res.status(500).json({ 
          message: 'Failed to create payment order',
          error: error.message 
        });
      }
    }

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        paymentId: payment._id,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        amount: bookingAmount,
        currency: 'INR',
        bookingId,
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentMethod: normalizedPaymentMethod,
      },
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Error creating payment order', error: error.message });
  }
};

// Create Razorpay order for product
exports.createOrderForProduct = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId, paymentMethod } = req.body;
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // This would reference your ProductOrder model
    // For now, we'll create a generic payment structure
    const paymentAmount = req.body.amount;
    const referenceId = mongoose.Types.ObjectId.isValid(orderId)
      ? new mongoose.Types.ObjectId(orderId)
      : new mongoose.Types.ObjectId();

    const payment = new Payment({
      userId,
      amount: paymentAmount,
      paymentMethod: normalizedPaymentMethod,
      referenceType: 'product_order',
      referenceId,
      status: 'initiated',
      description: `Payment for product order #${orderId}`,
      notes: `Original order reference: ${orderId}`,
    });

    if (normalizedPaymentMethod === 'razorpay') {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: paymentAmount * 100,
          currency: 'INR',
          receipt: `product_${orderId}_${Date.now()}`,
          notes: {
            orderId,
            customerId: userId.toString(),
          },
        });

        payment.razorpayOrderId = razorpayOrder.id;
        payment.status = 'pending';
      } catch (error) {
        console.error('Razorpay order creation error:', error);
        return res.status(500).json({ 
          message: 'Failed to create payment order',
          error: error.message 
        });
      }
    }

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        paymentId: payment._id,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        amount: paymentAmount,
        currency: 'INR',
        orderId,
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentMethod: normalizedPaymentMethod,
      },
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Error creating payment order', error: error.message });
  }
};

// ============ PAYMENT VERIFICATION ============

// Verify payment from Razorpay
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId,
    } = req.body;

    const resolvedOrderId = razorpayOrderId || razorpay_order_id;
    const resolvedPaymentId = razorpayPaymentId || razorpay_payment_id;
    const resolvedSignature = razorpaySignature || razorpay_signature;

    if (!resolvedOrderId || !resolvedPaymentId || !resolvedSignature) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    // Verify Razorpay signature
    const body = resolvedOrderId + '|' + resolvedPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== resolvedSignature) {
      return res.status(400).json({ 
        success: false,
        message: 'Payment verification failed - Invalid signature' 
      });
    }

    // Find and update payment record
    let payment = paymentId ? await Payment.findById(paymentId) : null;
    if (!payment) {
      payment = await Payment.findOne({ razorpayOrderId: resolvedOrderId });
    }
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Update payment with Razorpay details
    payment.razorpayPaymentId = resolvedPaymentId;
    payment.razorpaySignature = resolvedSignature;
    payment.status = 'completed';
    payment.completedAt = new Date();

    // Fetch payment details from Razorpay
    try {
      const paymentDetails = await razorpay.payments.fetch(resolvedPaymentId);
      payment.gatewayResponse = paymentDetails;
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }

    await payment.save();

    // Process payment based on reference type
    if (payment.referenceType === 'booking') {
      await processBookingPayment(payment);
    } else if (payment.referenceType === 'product_order') {
      await processProductOrderPayment(payment);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        status: payment.status,
        referenceType: payment.referenceType,
        referenceId: payment.referenceId,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};

// ============ PAYMENT PROCESSING FOR DIFFERENT REFERENCE TYPES ============

async function processBookingPayment(payment) {
  try {
    // Update booking status
    const booking = await Booking.findById(payment.referenceId);
    if (booking) {
      booking.paymentStatus = 'completed';
      booking.paymentMethod = 'razorpay';
      await booking.save();
    }

    // Credit professional wallet
    const professional = await Professional.findById(payment.professionalId);
    if (professional) {
      let wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
      if (!wallet) {
        wallet = new ProfessionalWallet({
          professionalId: professional._id,
          userId: professional.userId,
        });
      }

      // Create earning transaction
      const earningTransaction = new Transaction({
        walletId: wallet._id,
        professionalId: professional._id,
        userId: professional.userId,
        type: 'earning_booking',
        amount: payment.professionalAmount,
        status: 'completed',
        description: `Earning from booking #${payment.referenceId}`,
        referenceType: 'booking',
        referenceId: payment.referenceId,
        paymentMethod: 'razorpay',
        balanceBefore: wallet.currentBalance,
        balanceAfter: wallet.currentBalance + payment.professionalAmount,
        completedAt: new Date(),
      });

      await earningTransaction.save();

      // Update wallet
      wallet.totalEarnings += payment.amount;
      wallet.currentBalance += payment.professionalAmount;
      wallet.lastTransaction = earningTransaction._id;
      wallet.earningsBreakdown.today += payment.professionalAmount;
      wallet.earningsBreakdown.thisWeek += payment.professionalAmount;
      wallet.earningsBreakdown.thisMonth += payment.professionalAmount;
      wallet.earningsBreakdown.thisYear += payment.professionalAmount;
      await wallet.save();

      // Create commission transaction for admin
      const commissionTransaction = new Transaction({
        walletId: wallet._id,
        professionalId: professional._id,
        userId: professional.userId,
        type: 'commission_deducted',
        amount: payment.commissionAmount,
        status: 'completed',
        description: `Commission for booking #${payment.referenceId}`,
        referenceType: 'booking',
        referenceId: payment.referenceId,
        commissionDetails: {
          commissionAmount: payment.commissionAmount,
          commissionPercentage: payment.commissionPercentage,
          netAmount: payment.professionalAmount,
        },
        paymentMethod: 'razorpay',
        completedAt: new Date(),
      });

      await commissionTransaction.save();

      // Update wallet commission stats
      wallet.totalCommissionPaid += payment.commissionAmount;
      await wallet.save();
    }

    console.log(`Booking payment processed: ${payment._id}`);
  } catch (error) {
    console.error('Error processing booking payment:', error);
  }
}

async function processProductOrderPayment(payment) {
  try {
    // Update product order status
    const productOrder = await ProductOrder.findById(payment.referenceId);
    if (productOrder) {
      productOrder.paymentStatus = 'completed';
      productOrder.razorpayOrderId = payment.razorpayOrderId;
      productOrder.razorpayPaymentId = payment.razorpayPaymentId;
      productOrder.razorpaySignature = payment.razorpaySignature;
      productOrder.orderStatus = 'processing';
      await productOrder.save();
    }

    console.log(`Product order payment processed: ${payment._id}`);
  } catch (error) {
    console.error('Error processing product order payment:', error);
  }
}

// ============ CASH PAYMENT HANDLING ============

// Create payment for cash transaction
exports.createCashPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookingId, amount } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ message: 'Booking ID and amount are required' });
    }

    const booking = await Booking.findById(bookingId).populate('professionalId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Calculate commission
    const commissionAmount = Math.round((amount * COMMISSION_PERCENTAGE) / 100);
    const professionalAmount = amount - commissionAmount;

    // Create payment record for cash
    const payment = new Payment({
      userId,
      amount,
      paymentMethod: 'cash',
      referenceType: 'booking',
      referenceId: bookingId,
      status: 'pending',
      professionalId: booking.professionalId._id,
      commissionAmount,
      commissionPercentage: COMMISSION_PERCENTAGE,
      professionalAmount,
      adminAmount: commissionAmount,
      description: `Cash payment for booking #${bookingId}`,
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Cash payment record created',
      data: {
        paymentId: payment._id,
        amount,
        bookingId,
        paymentMethod: 'cash',
      },
    });
  } catch (error) {
    console.error('Error creating cash payment:', error);
    res.status(500).json({ message: 'Error creating cash payment', error: error.message });
  }
};

// Confirm cash payment (by admin)
exports.confirmCashPayment = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { paymentId } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.collectedByAdmin = true;
    payment.collectedBy = adminId;

    await payment.save();

    // Process payment - credit professional
    const professional = await Professional.findById(payment.professionalId);
    if (professional) {
      let wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });
      if (!wallet) {
        wallet = new ProfessionalWallet({
          professionalId: professional._id,
          userId: professional.userId,
        });
      }

      // Create earning transaction
      const earningTransaction = new Transaction({
        walletId: wallet._id,
        professionalId: professional._id,
        userId: professional.userId,
        type: 'earning_booking',
        amount: payment.professionalAmount,
        status: 'completed',
        description: `Cash payment for booking #${payment.referenceId}`,
        referenceType: 'booking',
        referenceId: payment.referenceId,
        paymentMethod: 'cash',
        balanceBefore: wallet.currentBalance,
        balanceAfter: wallet.currentBalance + payment.professionalAmount,
        completedAt: new Date(),
      });

      await earningTransaction.save();

      wallet.totalEarnings += payment.amount;
      wallet.currentBalance += payment.professionalAmount;
      wallet.lastTransaction = earningTransaction._id;
      await wallet.save();
    }

    // Update booking
    const booking = await Booking.findById(payment.referenceId);
    if (booking) {
      booking.paymentStatus = 'completed';
      booking.paymentMethod = 'cash';
      await booking.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cash payment confirmed successfully',
      data: {
        paymentId,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error('Error confirming cash payment:', error);
    res.status(500).json({ message: 'Error confirming cash payment', error: error.message });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 20, skip = 0 } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('referenceId');

    res.status(200).json({
      success: true,
      data: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        payments,
      },
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ message: 'Error fetching payment history', error: error.message });
  }
};

module.exports = exports;
