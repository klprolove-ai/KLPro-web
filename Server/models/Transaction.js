const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    // Wallet Reference
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProfessionalWallet',
      required: true,
    },
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Transaction Details
    type: {
      type: String,
      enum: [
        'earning_booking',        // Earning from service booking
        'earning_product',        // Earning from product purchase
        'commission_deducted',    // Commission paid to admin
        'withdrawal_initiated',   // Withdrawal initiated
        'withdrawal_completed',   // Withdrawal completed
        'withdrawal_failed',      // Withdrawal failed
        'refund',                 // Refund processed
        'manual_credit',          // Manual credit by admin
        'manual_debit',           // Manual debit by admin
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Reference to related documents
    referenceType: {
      type: String,
      enum: ['booking', 'product_order', 'refund', 'withdrawal', 'manual'],
      default: 'manual',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Commission details (if applicable)
    commissionDetails: {
      commissionAmount: {
        type: Number,
        default: 0,
      },
      commissionPercentage: {
        type: Number,
        default: 0,
      },
      netAmount: {
        type: Number,
        default: 0,
      },
    },
    // Withdrawal details (if applicable)
    withdrawalDetails: {
      method: {
        type: String,
        enum: ['bank_transfer', 'upi', 'net_banking', 'wallet'],
      },
      bankDetailsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankDetails',
      },
      transactionId: {
        type: String,
        default: '',
      },
      failureReason: {
        type: String,
        default: '',
      },
    },
    // Payment method used
    paymentMethod: {
      type: String,
      enum: ['cash', 'razorpay', 'upi', 'net_banking', 'wallet_credit'],
      default: 'cash',
    },
    // Balance tracking
    balanceBefore: {
      type: Number,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      default: 0,
    },
    // Admin action if applicable
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminNotes: {
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
transactionSchema.index({ professionalId: 1, createdAt: -1 });
transactionSchema.index({ walletId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ referenceId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
