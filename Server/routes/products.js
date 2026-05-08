const express = require('express');
const router = express.Router();

// Controllers
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  getProductCategories,
  createProductOrder,
} = require('../controllers/productController');

// Middleware
const { verifyToken } = require('../middleware/auth');
const verifyAdminToken = require('../middleware/adminAuth');
const upload = require('../middleware/upload');

// Public routes
router.get('/categories', getProductCategories);
router.get('/', getAllProducts);

// User routes - MUST be before /:id route to avoid conflict
router.post('/create-order', verifyToken, createProductOrder);

// Product details route - AFTER specific routes
router.get('/:id', getProductById);

// Admin routes
router.post('/', verifyAdminToken, createProduct);
router.put('/:id', verifyAdminToken, updateProduct);
router.delete('/:id', verifyAdminToken, deleteProduct);

// Image upload routes
router.post('/:id/images', verifyAdminToken, upload.array('images', 4), uploadProductImages);
router.delete('/:id/images', verifyAdminToken, deleteProductImage);

module.exports = router;
