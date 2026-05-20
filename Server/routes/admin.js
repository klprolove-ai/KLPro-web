const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const Booking = require('../models/Booking');
const ProductOrder = require('../models/ProductOrder');
const {
  adminLogin,
  adminLogout,
  getAdminProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStatistics,
  getProfessionalApplications,
  reviewProfessionalApplication,
} = require('../controllers/adminController');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceStatistics,
  toggleServiceStatus,
  toggleMostBooked,
  bulkUploadServices
} = require('../controllers/serviceController');
const {
  getAllContacts,
  deleteContact
} = require('../controllers/contactController');
const {
  getHomepageCardsAdmin,
  createHomepageCard,
  updateHomepageCard,
  deleteHomepageCard,
} = require('../controllers/homepageCardController');
const { endCallSession } = require('../services/callSessionService');
const verifyAdminToken = require('../middleware/adminAuth');

// Debug middleware
router.use((req, res, next) => {
  console.log(`Admin route hit: ${req.method} ${req.path}`);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? 'Present' : 'Not present');
  }
  next();
});

// Test route (no auth required)
router.get('/test', (req, res) => {
  res.json({ message: 'Admin router is working' });
});

// Public routes
router.post('/login', adminLogin);

// Protected routes
router.post('/logout', verifyAdminToken, adminLogout);
router.get('/profile', verifyAdminToken, getAdminProfile);

// User Management Routes (Admin only)
// Important: Specific routes must come before dynamic routes
router.get('/users/stats', verifyAdminToken, getUserStatistics);
router.get('/users', verifyAdminToken, getAllUsers);
router.get('/professionals/applications', verifyAdminToken, getProfessionalApplications);
router.patch('/professionals/:id/review', verifyAdminToken, reviewProfessionalApplication);
router.get('/users/:id', verifyAdminToken, getUserById);
router.put('/users/:id', verifyAdminToken, updateUser);
router.delete('/users/:id', verifyAdminToken, deleteUser);

// Service Management Routes (Admin only)
// Important: Specific routes must come before dynamic routes
router.post('/services/bulk-upload', verifyAdminToken, upload.single('file'), bulkUploadServices);
router.get('/services/stats', verifyAdminToken, getServiceStatistics);
router.patch('/services/:id/toggle', verifyAdminToken, toggleServiceStatus);
router.patch('/services/:id/most-booked', verifyAdminToken, toggleMostBooked);
router.delete('/services/:id', verifyAdminToken, deleteService);
router.put('/services/:id', verifyAdminToken, upload.single('image'), updateService);
router.get('/services/:id', verifyAdminToken, getServiceById);
router.post('/services', verifyAdminToken, upload.single('image'), createService);
router.get('/services', verifyAdminToken, getAllServices);

// Admin Contact Management
router.get('/contacts', verifyAdminToken, getAllContacts);
router.delete('/contacts/:id', verifyAdminToken, deleteContact);

// Admin Homepage Cards Management
router.get('/homepage-cards', verifyAdminToken, getHomepageCardsAdmin);
router.post('/homepage-cards', verifyAdminToken, upload.single('imageFile'), createHomepageCard);
router.put('/homepage-cards/:id', verifyAdminToken, upload.single('imageFile'), updateHomepageCard);
router.delete('/homepage-cards/:id', verifyAdminToken, deleteHomepageCard);

// Booking workflow visibility for admin
router.get('/bookings', verifyAdminToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ adminArchived: { $ne: true } })
      .populate('customerId', 'name email phone city')
      .populate({
        path: 'professionalId',
        populate: { path: 'userId', select: 'name email phone city' },
      })
      .populate('serviceId', 'name category subCategory basePrice commissionToKlPro gstFromCustomer cashPaymentPlatformChargeFromCustomer')
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/orders', verifyAdminToken, async (req, res) => {
  try {
    // Only show orders that have been confirmed (payment completed or COD)
    // Exclude orders in 'awaiting_payment' status that were never paid
    const orders = await ProductOrder.find({ orderStatus: { $ne: 'awaiting_payment' } })
      .populate('customerId', 'name email phone city')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/orders/:id', verifyAdminToken, async (req, res) => {
  try {
    const order = await ProductOrder.findById(req.params.id)
      .populate('customerId', 'name email phone city');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/orders/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { orderStatus } = req.body;
    // Note: 'awaiting_payment' status is reserved for unpaid orders - admins cannot manually set this
    const allowedStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!orderStatus || !allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await ProductOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Prevent status change if order is still awaiting payment
    if (order.orderStatus === 'awaiting_payment') {
      return res.status(400).json({ success: false, message: 'Cannot update order status - payment is still pending. Order will be deleted if payment is not completed.' });
    }

    order.orderStatus = orderStatus;
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bookings/:id', verifyAdminToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email phone city')
      .populate({
        path: 'professionalId',
        populate: { path: 'userId', select: 'name email phone city' },
      })
      .populate('serviceId', 'name category subCategory basePrice commissionToKlPro gstFromCustomer cashPaymentPlatformChargeFromCustomer');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/bookings/:id', verifyAdminToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.json({ success: true, message: 'Booking history already removed' });
    }

    if (booking.adminArchived) {
      return res.json({ success: true, message: 'Booking history already removed' });
    }

    endCallSession('booking', booking._id, {
      reason: 'booking-deleted-by-admin',
      endedBy: req.admin?.email || 'admin',
    });

    booking.adminArchived = true;
    booking.adminArchivedAt = new Date();
    booking.adminArchivedBy = req.admin?.email || 'admin';
    await booking.save();

    res.json({ success: true, message: 'Booking history deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clean up abandoned product orders (awaiting_payment status older than 30 minutes)
router.post('/cleanup/abandoned-orders', verifyAdminToken, async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Delete orders that are still in 'awaiting_payment' status and were created more than 30 minutes ago
    const result = await ProductOrder.deleteMany({
      orderStatus: 'awaiting_payment',
      paymentCreatedAt: { $lt: thirtyMinutesAgo }
    });

    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} abandoned orders`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
