const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // OTP expires in 10 minutes (600 seconds)
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OTP', otpSchema);
