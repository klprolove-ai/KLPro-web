const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Payment creation routes
router.post('/create-order-booking', auth, paymentController.createOrderForBooking);
router.post('/create-order-product', auth, paymentController.createOrderForProduct);
router.post('/create-cash-payment', auth, paymentController.createCashPayment);

// Wallet top-up routes
router.post('/create-topup-order', auth, paymentController.createTopupOrder);
router.post('/verify-topup', auth, paymentController.verifyTopupPayment);

// Payment verification
router.post('/verify', auth, paymentController.verifyPayment);

// Payment history
router.get('/history', auth, paymentController.getPaymentHistory);

// Admin routes for cash payment confirmation
router.post('/confirm-cash', auth, paymentController.confirmCashPayment);

module.exports = router;
