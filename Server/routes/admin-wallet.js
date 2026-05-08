const express = require('express');
const router = express.Router();
const adminWalletController = require('../controllers/adminWalletController');
const { auth, requireRole } = require('../middleware/auth');

// Admin wallet details
router.get('/details', auth, requireRole('admin'), adminWalletController.getAdminWalletDetails);
router.get('/commission-report', auth, requireRole('admin'), adminWalletController.getCommissionReport);

// Professional earnings management
router.get('/professional-earnings', auth, requireRole('admin'), adminWalletController.getProfessionalEarnings);
router.post('/credit-wallet', auth, requireRole('admin'), adminWalletController.creditProfessionalWallet);
router.post('/debit-wallet', auth, requireRole('admin'), adminWalletController.debitProfessionalWallet);

// Wallet suspension/reactivation
router.post('/suspend-wallet', auth, requireRole('admin'), adminWalletController.suspendProfessionalWallet);
router.post('/reactivate-wallet', auth, requireRole('admin'), adminWalletController.reactivateProfessionalWallet);

// Reports and analytics
router.get('/transaction-report', auth, requireRole('admin'), adminWalletController.getTransactionReport);
router.get('/payment-analytics', auth, requireRole('admin'), adminWalletController.getPaymentAnalytics);

module.exports = router;
