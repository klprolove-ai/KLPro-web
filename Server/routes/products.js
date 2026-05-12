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
  getProductOrder,
  cancelProductOrder,
  getMyOrders,
  getProfessionalOrders,
  bulkUploadProducts
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
// Order endpoints for users/professionals
router.get('/orders/:id', verifyToken, getProductOrder);
router.patch('/orders/:id/cancel', verifyToken, cancelProductOrder);
router.get('/my-orders', verifyToken, getMyOrders);
router.get('/professional/orders', verifyToken, getProfessionalOrders);

// Product details route - AFTER specific routes
router.get('/:id', getProductById);

// Admin routes
router.post('/bulk-upload', verifyAdminToken, upload.single('file'), bulkUploadProducts);
router.post('/', verifyAdminToken, createProduct);
router.put('/:id', verifyAdminToken, updateProduct);
router.delete('/:id', verifyAdminToken, deleteProduct);

// Image upload routes
router.post('/:id/images', verifyAdminToken, upload.array('images', 4), uploadProductImages);
router.delete('/:id/images', verifyAdminToken, deleteProductImage);

module.exports = router;
