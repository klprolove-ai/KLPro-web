const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    specializations: [
      {
        type: String,
      },
    ],
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    subCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    subSubCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    serviceTypes: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
    },
    subSubCategory: {
      type: String,
      trim: true,
      default: '',
    },
    serviceType: {
      type: String,
      trim: true,
      default: '',
    },
    currentCity: {
      type: String,
      trim: true,
      default: '',
    },
    currentLocation: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      accuracy: {
        type: Number,
        default: null,
      },
      address: {
        type: String,
        default: '',
        trim: true,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    panCardNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    panCardImageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    aadhaarCardNumber: {
      type: String,
      required: true,
      trim: true,
    },
    aadhaarCardImageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    experience: {
      type: Number, // in years
      required: true,
    },
    bio: {
      type: String,
    },
    services: [
      {
        serviceId: mongoose.Schema.Types.ObjectId,
        serviceName: String,
        price: Number,
      },
    ],
    availability: [
      {
        day: String,
        startTime: String,
        endTime: String,
      },
    ],
    completedBookings: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: [
      {
        reviewer: mongoose.Schema.Types.ObjectId,
        rating: Number,
        comment: String,
        date: Date,
      },
    ],
    documents: [
      {
        name: String,
        url: String,
        verificationStatus: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending',
        },
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'completed', 'rejected'],
      default: 'pending',
    },
    verificationScheduledAt: {
      type: Date,
      default: null,
    },
    verificationScheduledTime: {
      type: String,
      default: '',
      trim: true,
    },
    verificationMeetingLink: {
      type: String,
      default: '',
      trim: true,
    },
    verificationNotification: {
      type: String,
      default: '',
      trim: true,
    },
    approvalNote: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedByAdminEmail: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    verificationCompletedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Professional', professionalSchema);
