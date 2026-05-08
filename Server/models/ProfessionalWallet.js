const mongoose = require('mongoose');

const professionalWalletSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
    totalCommissionPaid: {
      type: Number,
      default: 0,
    },
    // Earnings breakdown by period
    earningsBreakdown: {
      today: {
        type: Number,
        default: 0,
      },
      thisWeek: {
        type: Number,
        default: 0,
      },
      thisMonth: {
        type: Number,
        default: 0,
      },
      thisYear: {
        type: Number,
        default: 0,
      },
    },
    lastEarningsUpdate: {
      type: Date,
      default: Date.now,
    },
    // Wallet status
    status: {
      type: String,
      enum: ['active', 'frozen', 'suspended', 'inactive'],
      default: 'active',
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    // Minimum balance constraints
    minimumBalance: {
      type: Number,
      default: 0,
    },
    lastTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  { timestamps: true }
);

// Index for better query performance
professionalWalletSchema.index({ professionalId: 1 });
professionalWalletSchema.index({ userId: 1 });
professionalWalletSchema.index({ status: 1 });

module.exports = mongoose.model('ProfessionalWallet', professionalWalletSchema);
