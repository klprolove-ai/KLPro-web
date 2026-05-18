const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, 'Please provide a rating'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Please provide a review comment'],
    },
    reviewType: {
      type: String,
      enum: ['product', 'professional', 'service'],
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to prevent duplicate reviews
reviewSchema.index(
  { reviewer: 1, product: 1, reviewType: 1 },
  { sparse: true, unique: true }
);

reviewSchema.index(
  { reviewer: 1, service: 1, reviewType: 1 },
  { sparse: true, unique: true }
);

module.exports = mongoose.model('Review', reviewSchema);
