const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    serviceAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    duration: {
      type: Number, // in minutes
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },
    cancelReason: {
      type: String,
      default: '',
    },
    cancelledByRole: {
      type: String,
      enum: ['customer', 'professional', 'admin', 'system'],
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    startOtp: {
      type: String,
      default: '',
    },
    startOtpVerifiedAt: {
      type: Date,
      default: null,
    },
    completionOtp: {
      type: String,
      default: '',
    },
    completionOtpIssuedAt: {
      type: Date,
      default: null,
    },
    completionOtpVerifiedAt: {
      type: Date,
      default: null,
    },
    workStartPhotoUrl: {
      type: String,
      default: '',
    },
    workEndPhotoUrl: {
      type: String,
      default: '',
    },
    adminArchived: {
      type: Boolean,
      default: false,
    },
    adminArchivedAt: {
      type: Date,
      default: null,
    },
    adminArchivedBy: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    review: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'razorpay'],
    },
    auditLogs: [
      {
        action: {
          type: String,
          required: true,
        },
        actorRole: {
          type: String,
          enum: ['customer', 'professional', 'admin', 'system'],
          default: 'system',
        },
        actorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        actorLabel: {
          type: String,
          default: '',
          trim: true,
        },
        notes: {
          type: String,
          default: '',
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
