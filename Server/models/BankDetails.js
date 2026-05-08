const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
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
    // Bank Details
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    ifscCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    branchName: {
      type: String,
      trim: true,
    },
    // UPI Details (optional)
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    // Verification Status
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed', 'rejected'],
      default: 'pending',
    },
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    verificationFailureReason: {
      type: String,
      default: '',
    },
    verificationFailedAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    // Document verification
    bankAccountProofUrl: {
      type: String,
      default: '',
    },
    // Additional payment methods
    paymentMethods: [
      {
        methodType: {
          type: String,
          enum: ['bank', 'upi', 'net_banking', 'wallet'],
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        details: {
          type: String,
        },
      },
    ],
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for better query performance
bankDetailsSchema.index({ professionalId: 1 });
bankDetailsSchema.index({ userId: 1 });
bankDetailsSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
