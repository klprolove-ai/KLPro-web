const mongoose = require('mongoose');

const homepageCardSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      enum: [
        'explore-popular-categories',
        'salon-for-women',
        'cleaning-essentials',
        'grooming-for-men',
        'home-decoration',
        'property-services',
        'snap-click',
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    time: {
      type: String,
      trim: true,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model('HomepageCard', homepageCardSchema);
