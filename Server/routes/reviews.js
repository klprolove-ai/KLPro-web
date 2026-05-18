const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getProfessionalReviews,
  getServiceReviews,
  getAllReviews,
  deleteReview,
} = require('../controllers/reviewController');
const verifyToken = require('../middleware/auth');
const verifyAdminToken = require('../middleware/adminAuth');

// Authenticated user routes
router.post('/', verifyToken, createReview);
router.delete('/:id', verifyToken, deleteReview);

// Public routes
router.get('/product/:productId', getProductReviews);
router.get('/professional/:professionalId', getProfessionalReviews);
router.get('/service/:serviceId', getServiceReviews);

// Admin routes
router.get('/', verifyAdminToken, getAllReviews);

module.exports = router;
