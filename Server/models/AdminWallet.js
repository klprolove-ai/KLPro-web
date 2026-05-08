const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema(
  {
    // Admin Reference (typically one admin wallet per admin)
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Balance Information
    totalBalance: {
      type: Number,
      default: 0,
    },
    totalCommissionReceived: {
      type: Number,
      default: 0,
    },
    totalCashCollected: {
      type: Number,
      default: 0,
    },
    totalPayoutsMade: {
      type: Number,
      default: 0,
    },
    // Commission breakdown by period
    commissionBreakdown: {
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
    // Cash collection breakdown
    cashBreakdown: {
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
    // Summary stats
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalProductOrders: {
      type: Number,
      default: 0,
    },
    totalRefunds: {
      type: Number,
      default: 0,
    },
    // Wallet status
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // Last update
    lastBalanceUpdate: {
      type: Date,
      default: Date.now,
    },
    lastTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  { timestamps: true }
);

// Index for better query performance
adminWalletSchema.index({ adminId: 1 });
adminWalletSchema.index({ status: 1 });

module.exports = mongoose.model('AdminWallet', adminWalletSchema);
