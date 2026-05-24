const express = require('express');
const router = express.Router();
const Professional = require('../models/Professional');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const Booking = require('../models/Booking');
const { getOnlineProfessionalUserIds } = require('../realtime/presence');

const ACTIVE_BLOCKING_STATUSES = ['pending', 'confirmed', 'in-progress'];

const uploadBufferToCloudinary = (buffer, folder, publicId) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
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

    uploadStream.end(buffer);
  });

const resolveProfessionalCity = (professionalDoc) => {
  const professional = professionalDoc?.toObject ? professionalDoc.toObject() : professionalDoc;
  return String(
    professional?.currentCity ||
      professional?.userId?.city ||
      professional?.userId?.address ||
      professional?.userId?.profileCity ||
      ''
  ).trim();
};

const normalizeArrayField = (fieldValue) => {
  if (!fieldValue) return [];
  if (Array.isArray(fieldValue)) {
    return fieldValue.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(fieldValue)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const profileImageUpload = (req, res, next) => {
  upload.single('profileImage')(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ message: uploadError.message || 'Invalid image upload request' });
    }
    next();
  });
};

// Update current live location for the logged-in professional
router.put('/me/location', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized request' });
    }

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracy = req.body.accuracy !== undefined && req.body.accuracy !== null ? Number(req.body.accuracy) : null;
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required' });
    }

    const professional = await Professional.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: {
          currentLocation: {
            latitude,
            longitude,
            accuracy: Number.isNaN(accuracy) ? null : accuracy,
            address,
            updatedAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate('userId', 'name email phone rating approvalStatus profileImage');

    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const result = professional.toObject();
    result.currentCity = resolveProfessionalCity(result);

    res.json({
      success: true,
      professional: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit or update rating for a professional
router.post('/:id/rate', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const professional = await Professional.findById(req.params.id);
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    const existingReviewIndex = (professional.reviews || []).findIndex(
      (review) => String(review.reviewer) === String(req.userId)
    );

    if (existingReviewIndex >= 0) {
      professional.reviews[existingReviewIndex].rating = numericRating;
      professional.reviews[existingReviewIndex].comment = comment || professional.reviews[existingReviewIndex].comment || '';
      professional.reviews[existingReviewIndex].date = new Date();
    } else {
      professional.reviews.push({
        reviewer: req.userId,
        rating: numericRating,
        comment: comment || '',
        date: new Date(),
      });
    }

    const totalRating = professional.reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
    professional.rating = professional.reviews.length ? Number((totalRating / professional.reviews.length).toFixed(2)) : 0;

    await professional.save();

    res.json({
      success: true,
      professionalId: professional._id,
      rating: professional.rating,
      reviewsCount: professional.reviews.length,
      userRating: numericRating,
      message: existingReviewIndex >= 0 ? 'Rating updated successfully' : 'Rating submitted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get logged-in professional profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized request' });
    }

    const professional = await Professional.findOne({ userId: req.userId }).populate(
      'userId',
      'name email phone rating approvalStatus profileImage'
    );

    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const onlineSet = getOnlineProfessionalUserIds();
    const result = professional.toObject();
    result.isOnline = onlineSet.has(String(result.userId?._id || ''));
    result.currentCity = resolveProfessionalCity(result);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update logged-in professional profile
router.put('/me', authMiddleware, profileImageUpload, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized request' });
    }

    const { category, subCategory, subSubCategory, serviceType, currentCity, bio, experience } = req.body;
    let parsedAvailability = req.body.availability;
    let parsedServices = req.body.services;

    if (typeof parsedAvailability === 'string') {
      try {
        parsedAvailability = JSON.parse(parsedAvailability);
      } catch (parseError) {
        return res.status(400).json({ message: 'Invalid availability format' });
      }
    }

    if (typeof parsedServices === 'string') {
      try {
        parsedServices = JSON.parse(parsedServices);
      } catch (parseError) {
        return res.status(400).json({ message: 'Invalid services format' });
      }
    }

    const professional = await Professional.findOne({ userId: req.userId });
    if (!professional) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const normalizedCategory = typeof category === 'string' ? category.trim() : '';
    const normalizedSubCategory = typeof subCategory === 'string' ? subCategory.trim() : '';
    const normalizedSubSubCategory = typeof subSubCategory === 'string' ? subSubCategory.trim() : '';
    const normalizedServiceType = typeof serviceType === 'string' ? serviceType.trim() : '';
    const normalizedCurrentCity = typeof currentCity === 'string' ? currentCity.trim() : '';

    const updates = {};

    if (category !== undefined && normalizedCategory) updates.category = normalizedCategory;
    if (subCategory !== undefined && normalizedSubCategory) updates.subCategory = normalizedSubCategory;
    if (subSubCategory !== undefined) updates.subSubCategory = normalizedSubSubCategory;
    if (serviceType !== undefined) updates.serviceType = normalizedServiceType;
    if (currentCity !== undefined) updates.currentCity = normalizedCurrentCity;
    if (bio !== undefined) updates.bio = bio;
    if (experience !== undefined) updates.experience = Number(experience) || 0;

    if (Array.isArray(parsedServices)) {
      updates.services = parsedServices
        .filter((item) => item && (item.serviceName || item.serviceId) && Number(item.price) > 0)
        .map((item) => ({
          serviceName: item.serviceName ? String(item.serviceName).trim() : '',
          serviceId: item.serviceId || undefined,
          price: Number(item.price),
        }));
    }

    if (Array.isArray(parsedAvailability)) {
      updates.availability = parsedAvailability
        .filter((slot) => slot && slot.day && slot.startTime && slot.endTime)
        .map((slot) => ({
          day: String(slot.day).trim(),
          startTime: String(slot.startTime).trim(),
          endTime: String(slot.endTime).trim(),
        }));
    }

    if (req.file && req.file.buffer) {
      let cloudinaryResult;
      try {
        cloudinaryResult = await uploadBufferToCloudinary(
          req.file.buffer,
          'kl-pro/professionals',
          `professional-${req.userId}`
        );
      } catch (cloudinaryError) {
        return res.status(502).json({ message: cloudinaryError.message || 'Failed to upload profile image' });
      }

      user.profileImage = cloudinaryResult.secure_url;
      await user.save();
    }

    if (Object.keys(updates).length > 0) {
      await Professional.updateOne({ _id: professional._id }, { $set: updates });
    }

    const populated = await Professional.findById(professional._id).populate(
      'userId',
      'name email phone rating approvalStatus profileImage'
    );

    const result = populated.toObject();
    result.currentCity = resolveProfessionalCity(result);

    res.json(result);
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get all professionals
router.get('/', async (req, res) => {
  try {
    const professionals = await Professional.find({
      approvalStatus: 'approved',
      isBlocked: false,
      isDeleted: { $ne: true },
      verificationStatus: 'completed',
    }).populate('userId', 'name email phone city rating approvalStatus profileImage');

    const onlineSet = getOnlineProfessionalUserIds();
    const mapped = professionals.map((professional) => {
      const result = professional.toObject();
      result.isOnline = onlineSet.has(String(result.userId?._id || ''));
      result.currentCity = resolveProfessionalCity(result);
      return result;
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get professional by ID
router.get('/:id', async (req, res) => {
  try {
    const professional = await Professional.findOne({
      _id: req.params.id,
      approvalStatus: 'approved',
      isDeleted: { $ne: true },
      verificationStatus: 'completed',
    }).populate('userId', 'name email phone profileImage');
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    const result = professional.toObject();
    const onlineSet = getOnlineProfessionalUserIds();
    result.isOnline = onlineSet.has(String(result.userId?._id || ''));

    // Populate services dynamically based on professional's category/subcategory
    const Service = require('../models/Service');
    const matchingServices = await Service.find({
      $or: [
        { category: professional.category },
        { subCategory: professional.subCategory },
        { subSubCategory: professional.subSubCategory },
        { serviceType: professional.serviceType },
      ],
      isActive: true,
    });

    // If professional has services array defined, use those; otherwise use matched services
    if (result.services && Array.isArray(result.services) && result.services.length > 0) {
      // Keep existing services if defined
    } else {
      // Use matched services
      result.services = matchingServices.map((service) => ({
        serviceId: service._id,
        serviceName: service.name,
        price: service.basePrice,
      }));
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create professional profile
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      specializations,
      experience,
      bio,
      services,
      category,
      subCategory,
      subSubCategory,
      serviceType,
      categories,
      subCategories,
      subSubCategories,
      serviceTypes,
      panCardNumber,
      aadhaarCardNumber,
      panCardImageUrl,
      aadhaarCardImageUrl,
    } = req.body;

    const normalizedCategories = normalizeArrayField(categories || category);
    const normalizedSubCategories = normalizeArrayField(subCategories || subCategory);
    const normalizedSubSubCategories = normalizeArrayField(subSubCategories || subSubCategory);
    const normalizedServiceTypes = normalizeArrayField(serviceTypes || serviceType);

    if (
      !normalizedCategories.length ||
      !normalizedSubCategories.length ||
      !panCardNumber ||
      !aadhaarCardNumber ||
      !panCardImageUrl ||
      !aadhaarCardImageUrl
    ) {
      return res.status(400).json({
        message:
          'Category, subcategory, PAN, Aadhaar, PAN image and Aadhaar image are required for professionals',
      });
    }

    const professional = new Professional({
      userId: req.userId,
      specializations: normalizeArrayField(specializations),
      experience,
      bio,
      services,
      categories: normalizedCategories,
      subCategories: normalizedSubCategories,
      subSubCategories: normalizedSubSubCategories,
      serviceTypes: normalizedServiceTypes,
      category,
      subCategory,
      subSubCategory,
      serviceType,
      panCardNumber,
      panCardImageUrl,
      aadhaarCardNumber,
      aadhaarCardImageUrl,
      approvalStatus: 'pending',
    });
    await professional.save();
    res.status(201).json(professional);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update professional profile
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const professional = await Professional.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }
    res.json(professional);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
