const mongoose = require('mongoose');

const ProductOrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    shippingDetails: {
      fullName: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      pincode: String,
    },
    subtotal: Number,
    shipping: Number,
    tax: Number,
    total: Number,
    paymentMethod: {
      type: String,
      enum: ['cod', 'razorpay'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    orderStatus: {
      type: String,
      enum: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductOrder', ProductOrderSchema);
