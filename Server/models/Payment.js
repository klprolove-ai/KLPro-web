const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // Razorpay Payment Details
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    // User/Customer Details
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Payment Amount & Details
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'razorpay', 'upi', 'net_banking', 'wallet_credit'],
      default: 'razorpay',
    },
    // Reference to booking or product
    referenceType: {
      type: String,
      enum: ['booking', 'product_order', 'wallet_topup'],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ['initiated', 'pending', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'initiated',
    },
    // Commission Breakdown
    commissionAmount: {
      type: Number,
      default: 0,
    },
    commissionPercentage: {
      type: Number,
      default: 0,
    },
    professionalAmount: {
      type: Number,
      default: 0,
    },
    adminAmount: {
      type: Number,
      default: 0,
    },
    // Professional/Receiver Info
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      default: null,
    },
    // Metadata
    description: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // Refund Details
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundReason: {
      type: String,
      default: '',
    },
    // Payment gateway response
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Bank details for cash payment
    collectedByAdmin: {
      type: Boolean,
      default: false,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Error handling
    failureReason: {
      type: String,
      default: '',
    },
    errorDetails: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for better query performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ referenceType: 1, referenceId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ professionalId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
