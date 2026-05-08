const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const { auth } = require('../middleware/auth');

// User refund operations
router.post('/request', auth, refundController.requestRefund);
router.get('/my-refunds', auth, refundController.getUserRefunds);
router.get('/:refundId', auth, refundController.getRefundDetails);

// Admin refund operations
router.post('/approve', auth, refundController.approveRefund);
router.post('/reject', auth, refundController.rejectRefund);
router.get('/', auth, refundController.getAllRefunds);

// Webhook for Razorpay refund updates
router.post('/webhook/razorpay', refundController.handleRefundWebhook);

module.exports = router;
