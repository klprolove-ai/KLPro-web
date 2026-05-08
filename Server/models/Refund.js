const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    // Payment Reference
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    razorpayRefundId: {
      type: String,
      default: '',
    },
    // User Details
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Refund Details
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        'user_request',
        'booking_cancelled',
        'professional_rejected',
        'service_not_completed',
        'customer_complaint',
        'duplicate_payment',
        'overpayment',
        'technical_error',
        'admin_adjustment',
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    // Status Tracking
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'rejected'],
      default: 'pending',
    },
    // Reference to booking/order if applicable
    referenceType: {
      type: String,
      enum: ['booking', 'product_order'],
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Professional Impact (if applicable)
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      default: null,
    },
    // Commission returned to professional if applicable
    commissionReversed: {
      type: Number,
      default: 0,
    },
    // Admin approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalNotes: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    // Refund Method
    refundMethod: {
      type: String,
      enum: ['original_payment_method', 'wallet_credit'],
      default: 'original_payment_method',
    },
    // Gateway Response
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Failure details
    failureReason: {
      type: String,
      default: '',
    },
    failureDetails: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Visibility settings for user
    visibleToUser: {
      type: Boolean,
      default: true,
    },
    userNotified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for better query performance
refundSchema.index({ userId: 1, createdAt: -1 });
refundSchema.index({ paymentId: 1 });
refundSchema.index({ status: 1 });
refundSchema.index({ referenceId: 1 });
refundSchema.index({ professionalId: 1 });

module.exports = mongoose.model('Refund', refundSchema);
