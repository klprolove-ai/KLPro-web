const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Professional = require('../models/Professional');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const heicConvert = require('heic-convert');
const { emitToUser, emitGlobal } = require('../realtime/presence');
const { endCallSession } = require('../services/callSessionService');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const ACTIVE_BLOCKING_STATUSES = ['pending', 'confirmed', 'in-progress'];
const RELEASING_STATUSES = ['rejected', 'cancelled', 'completed'];

const sanitizeBookingForProfessional = (bookingDoc) => {
  const booking = typeof bookingDoc?.toObject === 'function' ? bookingDoc.toObject() : bookingDoc;
  if (!booking) return booking;

  delete booking.startOtp;
  delete booking.completionOtp;
  return booking;
};

const appendAuditLog = (booking, entry) => {
  if (!booking.auditLogs) {
    booking.auditLogs = [];
  }
  booking.auditLogs.push({
    action: entry.action,
    actorRole: entry.actorRole || 'system',
    actorId: entry.actorId || null,
    actorLabel: entry.actorLabel || '',
    notes: entry.notes || '',
    createdAt: new Date(),
  });
};

const emitProfessionalAvailabilityChange = (professionalId, status, reason) => {
  emitGlobal('professionals-availability-updated', {
    professionalId: String(professionalId),
    status,
    reason,
    at: new Date().toISOString(),
  });
};

const emitBookingStatusChanged = (payload) => {
  emitGlobal('booking-status-changed', {
    bookingId: String(payload.bookingId),
    professionalId: String(payload.professionalId),
    status: payload.status,
    at: new Date().toISOString(),
  });
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const normalizeImageBuffer = async (buffer, mimeType, fileName) => {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  const lowerFileName = String(fileName || '').toLowerCase();
  const extensionLooksHeic = lowerFileName.endsWith('.heic') || lowerFileName.endsWith('.heif');

  if (normalizedMimeType === 'image/heic' || normalizedMimeType === 'image/heif' || extensionLooksHeic) {
    const converted = await heicConvert({
      buffer,
      format: 'JPEG',
      quality: 0.9,
    });

    return {
      buffer: Buffer.from(converted),
      extension: 'jpg',
    };
  }

  return {
    buffer,
    extension: null,
  };
};

const uploadBufferToCloudinary = async (buffer, folder, publicId, mimeType, fileName) => {
  const normalized = await normalizeImageBuffer(buffer, mimeType, fileName);
  const finalPublicId = normalized.extension ? `${publicId}.${normalized.extension}` : publicId;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: finalPublicId,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    uploadStream.end(normalized.buffer);
  });
};

const startPhotoUpload = (req, res, next) => {
  upload.single('startPhoto')(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ message: uploadError.message || 'Invalid start photo upload request' });
    }
    next();
  });
};

const completionPhotoUpload = (req, res, next) => {
  upload.single('endPhoto')(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ message: uploadError.message || 'Invalid completion photo upload request' });
    }
    next();
  });
};

// Get professional bookings for logged-in professional
router.get('/professional/my-jobs', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized request' });
    }

    const professional = await Professional.findOne({ userId: req.userId });

    if (!professional) {
      return res.json({
        professionalId: null,
        approvalStatus: 'pending',
        bookings: [],
      });
    }

    const bookings = await Booking.find({ professionalId: professional._id })
      .populate('customerId', 'name email phone city')
      .populate('serviceId', 'name basePrice category subCategory')
      .sort({ createdAt: -1 });

    const sanitizedBookings = bookings.map((booking) => sanitizeBookingForProfessional(booking));

    res.json({
      professionalId: professional._id,
      approvalStatus: professional.approvalStatus,
      bookings: sanitizedBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public slot availability for a professional on a specific date
router.get('/public/professional/:professionalId/slots', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const selectedDate = String(req.query.date || '').trim();

    if (!selectedDate) {
      return res.status(400).json({ message: 'date is required' });
    }

    const professional = await Professional.findById(professionalId).select('_id');
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    const bookings = await Booking.find({
      professionalId,
      scheduledDate: {
        $gte: startOfDay(selectedDate),
        $lte: endOfDay(selectedDate),
      },
      status: { $in: ACTIVE_BLOCKING_STATUSES },
    })
      .select('_id scheduledTime status customerId')
      .sort({ scheduledTime: 1 });

    res.json({
      success: true,
      date: selectedDate,
      bookedSlots: bookings.map((booking) => ({
        bookingId: String(booking._id),
        scheduledTime: booking.scheduledTime,
        status: booking.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update booking status by professional
router.put('/professional/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['confirmed', 'rejected', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const professional = await Professional.findOne({ userId: req.userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const booking = await Booking.findOne({ _id: req.params.id, professionalId: professional._id })
      .populate('customerId', 'name email phone city')
      .populate('serviceId', 'name basePrice category subCategory');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found for this professional' });
    }

    booking.status = status;
    booking.decisionAt = new Date();
    appendAuditLog(booking, {
      action: status === 'confirmed' ? 'booking-approved' : status === 'rejected' ? 'booking-rejected' : 'booking-cancelled-by-professional',
      actorRole: 'professional',
      actorId: req.userId,
      notes: `Booking marked as ${status}`,
    });
    await booking.save();

    if (['rejected', 'cancelled'].includes(status)) {
      endCallSession('booking', booking._id, {
        reason: `booking-${status}`,
        endedBy: req.userId,
      });
    }

    if (status === 'pending' || ACTIVE_BLOCKING_STATUSES.includes(status)) {
      emitProfessionalAvailabilityChange(professional._id, 'blocked', `booking-${status}`);
    }

    if (RELEASING_STATUSES.includes(status)) {
      emitProfessionalAvailabilityChange(professional._id, 'available', `booking-${status}`);
    }

    emitBookingStatusChanged({
      bookingId: booking._id,
      professionalId: professional._id,
      status,
    });

    res.json(sanitizeBookingForProfessional(booking));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Professional starts work after OTP verification and start photo upload
router.post('/professional/:id/start', authMiddleware, startPhotoUpload, async (req, res) => {
  try {
    const { startOtp } = req.body;

    if (!startOtp) {
      return res.status(400).json({ message: 'Start OTP is required' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Start work photo is required' });
    }

    const professional = await Professional.findOne({ userId: req.userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const booking = await Booking.findOne({ _id: req.params.id, professionalId: professional._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found for this professional' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Booking must be confirmed before start' });
    }

    if (String(booking.startOtp) !== String(startOtp).trim()) {
      return res.status(400).json({ message: 'Invalid start OTP' });
    }

    let photoUpload;
    try {
      photoUpload = await uploadBufferToCloudinary(
        req.file.buffer,
        'kl-pro/bookings/start',
        `booking-${booking._id}-start-${Date.now()}`,
        req.file.mimetype,
        req.file.originalname
      );
    } catch (uploadError) {
      return res.status(400).json({
        message:
          uploadError?.message ||
          'Failed to upload start photo. Please use JPG, PNG, or WebP and keep file size under 5MB.',
      });
    }

    booking.workStartPhotoUrl = photoUpload.secure_url;
    booking.startOtpVerifiedAt = new Date();
    booking.status = 'in-progress';
    appendAuditLog(booking, {
      action: 'work-started-with-otp',
      actorRole: 'professional',
      actorId: req.userId,
      notes: 'Start OTP verified and work start photo uploaded',
    });
    await booking.save();

    emitProfessionalAvailabilityChange(professional._id, 'blocked', 'booking-in-progress');
    emitBookingStatusChanged({
      bookingId: booking._id,
      professionalId: professional._id,
      status: 'in-progress',
    });

    res.json({
      success: true,
      message: 'Work started successfully',
      booking: sanitizeBookingForProfessional(booking),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Professional uploads completion photo and generates final OTP for customer
router.post('/professional/:id/prepare-completion', authMiddleware, completionPhotoUpload, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Completion photo is required' });
    }

    const professional = await Professional.findOne({ userId: req.userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const booking = await Booking.findOne({ _id: req.params.id, professionalId: professional._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found for this professional' });
    }

    if (booking.status !== 'in-progress') {
      return res.status(400).json({ message: 'Booking must be in-progress before completion verification' });
    }

    let photoUpload;
    try {
      photoUpload = await uploadBufferToCloudinary(
        req.file.buffer,
        'kl-pro/bookings/end',
        `booking-${booking._id}-end-${Date.now()}`,
        req.file.mimetype,
        req.file.originalname
      );
    } catch (uploadError) {
      return res.status(400).json({
        message:
          uploadError?.message ||
          'Failed to upload completion photo. Please use JPG, PNG, or WebP and keep file size under 5MB.',
      });
    }

    booking.workEndPhotoUrl = photoUpload.secure_url;
    booking.completionOtp = generateOtp();
    booking.completionOtpIssuedAt = new Date();
    appendAuditLog(booking, {
      action: 'completion-otp-issued',
      actorRole: 'professional',
      actorId: req.userId,
      notes: 'Completion photo uploaded and final OTP issued for customer handoff',
    });
    await booking.save();

    emitBookingStatusChanged({
      bookingId: booking._id,
      professionalId: professional._id,
      status: booking.status,
    });

    res.json({
      success: true,
      message: 'Completion OTP generated. Customer can view it in their booking details.',
      booking: sanitizeBookingForProfessional(booking),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Professional verifies completion OTP and completes booking
router.post('/professional/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { completionOtp } = req.body;

    if (!completionOtp) {
      return res.status(400).json({ message: 'Completion OTP is required' });
    }

    const professional = await Professional.findOne({ userId: req.userId }).select('_id');
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const booking = await Booking.findOne({ _id: req.params.id, professionalId: professional._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'in-progress') {
      return res.status(400).json({ message: 'Booking is not ready for completion verification' });
    }

    if (String(booking.completionOtp) !== String(completionOtp).trim()) {
      return res.status(400).json({ message: 'Invalid completion OTP' });
    }

    booking.status = 'completed';
    booking.paymentStatus = booking.paymentStatus === 'pending' ? 'completed' : booking.paymentStatus;
    booking.completionOtpVerifiedAt = new Date();
    appendAuditLog(booking, {
      action: 'booking-completed-with-otp',
      actorRole: 'professional',
      actorId: req.userId,
      notes: 'Completion OTP verified by professional',
    });
    await booking.save();

    endCallSession('booking', booking._id, {
      reason: 'booking-completed',
      endedBy: req.userId,
    });

    emitProfessionalAvailabilityChange(professional._id, 'available', 'booking-completed');
    emitBookingStatusChanged({
      bookingId: booking._id,
      professionalId: professional._id,
      status: 'completed',
    });

    res.json({ success: true, message: 'Booking completed successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Completion OTP is customer-owned, but final verification is done by professional.
router.post('/:id/verify-completion-otp', authMiddleware, async (req, res) => {
  res.status(403).json({
    message: 'Professional must verify completion OTP from the dashboard to complete booking',
  });
});

// Get user bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.userId })
      .populate('professionalId', 'userId')
      .populate('serviceId', 'name basePrice')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get booking by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('professionalId', 'userId')
      .populate('serviceId', 'name');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isCustomer = String(booking.customerId?._id || booking.customerId) === String(req.userId);
    let isAssignedProfessional = false;

    if (!isCustomer) {
      const professional = await Professional.findOne({ userId: req.userId }).select('_id');
      const bookingProfessionalId = String(booking.professionalId?._id || booking.professionalId || '');
      isAssignedProfessional = Boolean(professional && String(professional._id) === bookingProfessionalId);
    }

    if (!isCustomer && !isAssignedProfessional) {
      return res.status(403).json({ message: 'You are not authorized to view this booking' });
    }

    if (isAssignedProfessional) {
      return res.json(sanitizeBookingForProfessional(booking));
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      professionalId,
      serviceId,
      scheduledDate,
      scheduledTime,
      serviceAddress,
      price,
      notes,
      paymentMethod,
    } = req.body;

    const professional = await Professional.findById(professionalId).select('_id userId');
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    const conflict = await Booking.findOne({
      professionalId,
      scheduledTime,
      scheduledDate: {
        $gte: startOfDay(scheduledDate),
        $lte: endOfDay(scheduledDate),
      },
      status: { $in: ACTIVE_BLOCKING_STATUSES },
    });

    if (conflict) {
      return res.status(409).json({ message: 'Professional is not available at this time slot' });
    }

    const booking = new Booking({
      customerId: req.userId,
      professionalId,
      serviceId,
      scheduledDate,
      scheduledTime,
      serviceAddress,
      price,
      notes,
      paymentMethod: paymentMethod === 'online' ? 'razorpay' : paymentMethod || 'cash',
      paymentStatus: 'pending',
      startOtp: generateOtp(),
      auditLogs: [
        {
          action: 'booking-request-created',
          actorRole: 'customer',
          actorId: req.userId,
          notes: 'New booking request submitted',
        },
      ],
    });
    await booking.save();

    emitToUser(String(professional.userId), 'booking-request-created', {
      bookingId: String(booking._id),
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      customerId: String(req.userId),
    });
    emitBookingStatusChanged({
      bookingId: booking._id,
      professionalId: professional._id,
      status: 'pending',
    });
    emitProfessionalAvailabilityChange(professional._id, 'blocked', 'booking-pending');

    res.status(201).json({
      ...booking.toObject(),
      message: 'Booking request sent to professional. Share start OTP when work begins.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update booking status
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { rating, review, paymentStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.customerId) !== String(req.userId)) {
      return res.status(403).json({ message: 'You are not allowed to update this booking' });
    }

    if (rating !== undefined) booking.rating = rating;
    if (review !== undefined) booking.review = review;
    if (paymentStatus !== undefined) booking.paymentStatus = paymentStatus;

    appendAuditLog(booking, {
      action: 'booking-updated-by-customer',
      actorRole: 'customer',
      actorId: req.userId,
      notes: 'Customer updated rating/review/payment status',
    });

    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel booking
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.customerId) !== String(req.userId)) {
      return res.status(403).json({ message: 'You are not allowed to cancel this booking' });
    }

    if (!ACTIVE_BLOCKING_STATUSES.includes(String(booking.status))) {
      return res.status(400).json({ message: 'Only active bookings can be cancelled' });
    }

    booking.status = 'cancelled';
    booking.decisionAt = new Date();
    appendAuditLog(booking, {
      action: 'booking-cancelled-by-customer',
      actorRole: 'customer',
      actorId: req.userId,
      notes: 'Customer cancelled booking',
    });
    await booking.save();

    endCallSession('booking', booking._id, {
      reason: 'booking-cancelled',
      endedBy: req.userId,
    });

    const professional = await Professional.findById(booking.professionalId).select('_id userId');
    if (professional) {
      emitBookingStatusChanged({
        bookingId: booking._id,
        professionalId: professional._id,
        status: 'cancelled',
      });
      emitToUser(String(professional.userId), 'booking-status-changed', {
        bookingId: String(booking._id),
        status: 'cancelled',
      });
    }

    emitProfessionalAvailabilityChange(booking.professionalId, 'available', 'booking-cancelled');

    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
