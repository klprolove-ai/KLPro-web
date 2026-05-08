const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Professional wallet routes (require authentication)
router.get('/details', auth, walletController.getWalletDetails);
router.get('/earnings-report', auth, walletController.getEarningsReport);
router.get('/transaction-history', auth, walletController.getTransactionHistory);
router.get('/withdrawal-history', auth, walletController.getWithdrawalHistory);

// Bank details
router.post('/bank-details', auth, walletController.addBankDetails);
router.get('/bank-details', auth, walletController.getBankDetails);

// Withdrawal operations
router.post('/initiate-withdrawal', auth, walletController.initiateWithdrawal);

// Refunds visibility
router.get('/my-refunds', auth, walletController.getUserRefunds);

module.exports = router;
