const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
      default: '',
    },
    subSubCategory: {
      type: String,
      default: '',
    },
    serviceType: {
      type: String,
      default: '',
    },
    basePrice: {
      type: Number,
      required: [true, 'Please provide a base price'],
    },
    commissionToKlPro: {
      type: Number,
      default: 0,
    },
    gstFromCustomer: {
      type: Number,
      default: 0,
    },
    cashPaymentPlatformChargeFromCustomer: {
      type: Number,
      default: 0,
    },
    estimatedDuration: {
      type: Number, // in minutes
      required: true,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isMostBooked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
