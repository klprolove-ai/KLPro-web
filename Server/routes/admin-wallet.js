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

// Bank details verification
router.get('/bank-details/pending', auth, requireRole('admin'), adminWalletController.getPendingBankDetails);
router.post('/bank-details/verify', auth, requireRole('admin'), adminWalletController.verifyBankDetails);

// Withdrawal management
router.get('/withdrawals/pending', auth, requireRole('admin'), adminWalletController.getPendingWithdrawals);
router.get('/withdrawals/summary', auth, requireRole('admin'), adminWalletController.getWithdrawalSummary);
router.post('/withdrawals/:withdrawalId/approve', auth, requireRole('admin'), adminWalletController.approveWithdrawal);
router.post('/withdrawals/:withdrawalId/reject', auth, requireRole('admin'), adminWalletController.rejectWithdrawal);
router.post('/withdrawals/:withdrawalId/complete', auth, requireRole('admin'), adminWalletController.completeWithdrawal);

module.exports = router;
