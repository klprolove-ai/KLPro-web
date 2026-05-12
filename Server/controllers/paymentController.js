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
const { emitToUser, emitGlobal } = require('../realtime/presence');

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

const COMMISSION_PERCENTAGE = parseInt(process.env.COMMISSION_PERCENTAGE) || 10;

const normalizePaymentMethod = (value) => {
  const method = String(value || '').trim().toLowerCase();
  if (method === 'online') return 'razorpay';
  if (method === 'card' || method === 'upi' || method === 'wallet_credit' || method === 'cash') return method;
  return 'razorpay';
};

const buildRazorpayReceipt = (prefix, referenceId) => {
  const cleanReference = String(referenceId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-12);
  const shortTimestamp = Date.now().toString().slice(-6);
  return `${prefix}_${cleanReference}_${shortTimestamp}`;
};

// ============ PAYMENT CREATION ============

// Create Razorpay order for booking
exports.createOrderForBooking = async (req, res) => {
  try {
    console.log('[createOrderForBooking] Received request:', { body: req.body, userId: req.user?._id });
    
    const userId = req.user._id;
    const { bookingId, paymentMethod } = req.body;
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    if (!bookingId) {
      console.error('[createOrderForBooking] Missing bookingId');
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Get booking details
    console.log('[createOrderForBooking] Fetching booking:', bookingId);
    const booking = await Booking.findById(bookingId).populate('professionalId');
    if (!booking) {
      console.error('[createOrderForBooking] Booking not found:', bookingId);
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== userId.toString()) {
      console.error('[createOrderForBooking] Unauthorized access attempt');
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bookingStatus = String(booking.status || '').toLowerCase();
    const bookingPaymentStatus = String(booking.paymentStatus || '').toLowerCase();

    if (bookingPaymentStatus === 'completed') {
      console.error('[createOrderForBooking] Booking payment already completed:', booking._id);
      return res.status(400).json({ message: 'Payment is already completed for this booking' });
    }

    if (['cancelled', 'rejected'].includes(bookingStatus)) {
      console.error('[createOrderForBooking] Invalid booking status for payment:', booking.status);
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
        const rzp = getRazorpayInstance();
        if (!rzp) {
          console.error('Razorpay not initialized - missing credentials');
          console.error('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'MISSING');
          console.error('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'MISSING');
          return res.status(500).json({ 
            message: 'Razorpay is not configured',
            error: 'Missing Razorpay credentials (KEY_ID or KEY_SECRET not set)',
            code: 'RAZORPAY_CREDENTIALS_MISSING'
          });
        }
        
        // Create Razorpay order
        const bookingAmountInPaise = Math.round(bookingAmount * 100);
        const razorpayOrder = await rzp.orders.create({
          amount: bookingAmountInPaise, // Razorpay expects amount in paise
          currency: 'INR',
          receipt: buildRazorpayReceipt('book', bookingId),
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
    console.log('[createOrderForProduct] Received request:', { body: req.body, userId: req.user?._id });
    
    const userId = req.user._id;
    const { orderId, paymentMethod, amount } = req.body;
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    console.log('[createOrderForProduct] Processing with:', { orderId, paymentMethod, normalizedPaymentMethod, amount });

    if (!orderId) {
      console.error('[createOrderForProduct] Missing orderId');
      return res.status(400).json({ message: 'Order ID is required' });
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
      console.error('[createOrderForProduct] Invalid amount:', amount);
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const productOrder = await ProductOrder.findById(orderId).select('customerId orderStatus paymentStatus total');
    if (!productOrder) {
      return res.status(404).json({ message: 'Product order not found' });
    }

    if (String(productOrder.customerId) !== String(userId)) {
      return res.status(403).json({ message: 'Unauthorized to pay for this order' });
    }

    if (productOrder.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment is already completed for this order' });
    }

    // This would reference your ProductOrder model
    // For now, we'll create a generic payment structure
    const paymentAmount = parseFloat(amount);
    console.log('[createOrderForProduct] Parsed amount:', paymentAmount);

    const referenceId = new mongoose.Types.ObjectId(orderId);

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
        console.log('[createOrderForProduct] Attempting to initialize Razorpay...');
        const rzp = getRazorpayInstance();
        if (!rzp) {
          console.error('[createOrderForProduct] Razorpay not initialized - missing credentials');
          console.error('[createOrderForProduct] RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'MISSING');
          console.error('[createOrderForProduct] RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'MISSING');
          return res.status(500).json({ 
            message: 'Razorpay is not configured',
            error: 'Missing Razorpay credentials. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment.',
            code: 'RAZORPAY_CREDENTIALS_MISSING'
          });
        }
        
        const paymentAmountInPaise = Math.round(paymentAmount * 100);
        console.log('[createOrderForProduct] Creating Razorpay order with amount:', paymentAmountInPaise);
        const razorpayOrder = await rzp.orders.create({
          amount: paymentAmountInPaise,
          currency: 'INR',
          receipt: buildRazorpayReceipt('prod', orderId),
          notes: {
            orderId,
            customerId: userId.toString(),
          },
        });

        console.log('[createOrderForProduct] Razorpay order created:', razorpayOrder.id);
        payment.razorpayOrderId = razorpayOrder.id;
        payment.status = 'pending';
      } catch (error) {
        console.error('[createOrderForProduct] Razorpay order creation error:', error.message);
        console.error('[createOrderForProduct] Full error:', error);
        return res.status(500).json({ 
          message: 'Failed to create payment order',
          error: error.message,
          code: 'RAZORPAY_ORDER_CREATION_FAILED'
        });
      }
    }

    console.log('[createOrderForProduct] Saving payment document...');
    await payment.save();
    console.log('[createOrderForProduct] Payment saved with ID:', payment._id);

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
    console.error('[createOrderForProduct] Unexpected error:', error.message);
    console.error('[createOrderForProduct] Full error:', error);
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

    // Update payment record with Razorpay details
    const rzp = getRazorpayInstance();
    if (rzp && resolvedPaymentId) {
      const paymentDetails = await rzp.payments.fetch(resolvedPaymentId);
      payment.gatewayResponse = paymentDetails;
    }

    payment.razorpayPaymentId = resolvedPaymentId;
    payment.razorpaySignature = resolvedSignature;
    payment.status = 'completed';
    payment.completedAt = new Date();

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
    const booking = await Booking.findById(payment.referenceId).populate('professionalId', 'userId');
    if (booking) {
      booking.paymentStatus = 'completed';
      booking.paymentMethod = 'razorpay';
      await booking.save();

      const professionalUserId = String(booking.professionalId?.userId || '');
      if (professionalUserId) {
        emitToUser(professionalUserId, 'booking-request-created', {
          bookingId: String(booking._id),
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          customerId: String(booking.customerId),
        });
      }

      emitGlobal('booking-status-changed', {
        bookingId: String(booking._id),
        professionalId: String(booking.professionalId?._id || ''),
        status: 'pending',
        at: new Date().toISOString(),
      });

      emitGlobal('professionals-availability-updated', {
        professionalId: String(booking.professionalId?._id || ''),
        status: 'blocked',
        reason: 'booking-payment-completed',
        at: new Date().toISOString(),
      });
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
      // Change status from 'awaiting_payment' to 'processing' (confirmed and paid)
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

// ============ WALLET TOP-UP PAYMENTS ============

// Create Razorpay order for wallet top-up
exports.createTopupOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid top-up amount' });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount < 100 || paymentAmount > 1000000) {
      return res.status(400).json({ 
        message: 'Amount must be between ₹100 and ₹10,00,000' 
      });
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(500).json({ message: 'Payment service unavailable' });
    }

    const options = {
      amount: Math.round(paymentAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: buildRazorpayReceipt('TOPUP', userId),
    };

    const order = await rzp.orders.create(options);

    // Create Payment record with 'initiated' status
    const payment = new Payment({
      userId,
      amount: paymentAmount,
      paymentMethod: 'razorpay',
      referenceType: 'wallet_topup',
      referenceId: new mongoose.Types.ObjectId(),
      status: 'initiated',
      razorpayOrderId: order.id,
    });

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment order created',
      data: {
        orderId: order.id,
        key: process.env.RAZORPAY_KEY_ID,
        amount: paymentAmount,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    console.error('Error creating top-up order:', error);
    res.status(500).json({ message: 'Error creating payment order', error: error.message });
  }
};

// Verify and complete wallet top-up payment
exports.verifyTopupPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    // Verify Razorpay signature
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Get Razorpay payment details
    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(500).json({ message: 'Payment service unavailable' });
    }

    const payment = await rzp.payments.fetch(paymentId);

    // Find and update Payment record
    const paymentRecord = await Payment.findOne({
      razorpayOrderId: orderId,
      userId,
    });

    if (!paymentRecord) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.status !== 'captured') {
      return res.status(400).json({ message: 'Payment not captured' });
    }

    // Update payment record to completed
    paymentRecord.status = 'completed';
    paymentRecord.razorpayPaymentId = paymentId;
    paymentRecord.razorpaySignature = signature;
    paymentRecord.completedAt = new Date();
    await paymentRecord.save();

    // Add funds to professional wallet
    const professional = await Professional.findOne({ userId });
    let wallet = await ProfessionalWallet.findOne({ professionalId: professional._id });

    if (!wallet) {
      wallet = new ProfessionalWallet({
        professionalId: professional._id,
        userId,
      });
    }

    const amount = paymentRecord.amount;
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
      description: `Wallet top-up of ₹${amount} via Razorpay`,
      referenceType: 'manual',
      referenceId: paymentRecord._id,
      paymentMethod: 'razorpay',
      balanceBefore,
      balanceAfter: wallet.currentBalance,
      completedAt: new Date(),
    });

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Wallet top-up completed successfully',
      data: {
        amount,
        newBalance: wallet.currentBalance,
        transactionId: transaction._id,
        paymentId: paymentRecord._id,
      },
    });
  } catch (error) {
    console.error('Error verifying top-up payment:', error);
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

module.exports = exports;

// Perform a refund for a given payment object
exports.performRefund = async (payment, userId, referenceId) => {
  try {
    if (!payment || !payment.razorpayPaymentId) {
      throw new Error('Invalid payment or missing razorpayPaymentId');
    }

    const rzp = getRazorpayInstance();
    if (!rzp) throw new Error('Razorpay not configured');

    const amountPaise = Math.round(payment.amount * 100);
    const refund = await rzp.payments.refund(payment.razorpayPaymentId, { amount: amountPaise });

    // Create Refund record
    const RefundModel = require('../models/Refund');
    const refundDoc = await RefundModel.create({
      paymentId: payment._id,
      razorpayRefundId: refund.id,
      userId,
      amount: payment.amount,
      reason: 'user_request',
      description: `Refund for reference ${referenceId}`,
      status: refund && refund.status ? refund.status : 'processing',
      referenceType: payment.referenceType || 'product_order',
      referenceId,
      gatewayResponse: refund,
      completedAt: refund && (refund.status === 'processed' || refund.status === 'processed') ? new Date() : null,
    });

    // Update payment status
    payment.status = 'refunded';
    payment.razorpayRefundId = refund.id;
    await payment.save();

    return { refund: refundDoc, raw: refund };
  } catch (error) {
    console.error('performRefund error:', error);
    throw error;
  }
};
