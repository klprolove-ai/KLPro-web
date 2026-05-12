const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const Professional = require('../models/Professional');

// Create a review
exports.createReview = async (req, res) => {
  try {
    const { rating, comment, reviewType, productId, professionalId } = req.body;
    const userId = req.user._id;
    let professionalUserId = null;

    if (!rating || !comment || !reviewType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide rating, comment, and review type',
      });
    }

    if (![1, 2, 3, 4, 5].includes(parseInt(rating))) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    let reviewData = {
      rating: parseInt(rating),
      comment,
      reviewType,
      reviewer: userId,
    };

    if (reviewType === 'product') {
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required for product reviews',
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Check if user already reviewed this product
      const existingReview = await Review.findOne({
        reviewer: userId,
        product: productId,
        reviewType: 'product',
        isActive: { $ne: false },
      });

      if (existingReview) {
        // Update existing review instead of blocking
        const updatedReview = await Review.findByIdAndUpdate(
          existingReview._id,
          {
            rating: parseInt(rating),
            comment,
          },
          { new: true }
        );

        // Update product rating
        const allReviews = await Review.find({
          product: productId,
          reviewType: 'product',
          isActive: { $ne: false },
        });

        const avgRating =
          allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

        await Product.findByIdAndUpdate(
          productId,
          {
            rating: avgRating,
            reviewCount: allReviews.length,
          },
          { new: true }
        );

        const populatedReview = await Review.findById(updatedReview._id)
          .populate('reviewer', 'name profileImage')
          .populate('product', 'name');

        return res.status(200).json({
          success: true,
          message: 'Review updated successfully',
          review: populatedReview,
        });
      }

      reviewData.product = productId;
    } else if (reviewType === 'professional') {
      if (!professionalId) {
        return res.status(400).json({
          success: false,
          message: 'Professional ID is required for professional reviews',
        });
      }

      // Try to find by Professional._id first, then fallback to User._id
      let professional = await Professional.findById(professionalId).populate('userId');
      professionalUserId = professionalId;

      if (professional && professional.userId) {
        // If found as Professional record, use its userId
        professionalUserId = professional.userId._id;
      } else {
        // Otherwise try to find it as a User._id directly
        professional = await User.findById(professionalId);
      }

      if (!professional) {
        return res.status(404).json({
          success: false,
          message: 'Professional not found',
        });
      }

      // Validate that it's a professional user type
      const professionalUser = await User.findById(professionalUserId);
      if (!professionalUser || professionalUser.userType !== 'professional') {
        return res.status(404).json({
          success: false,
          message: 'Professional not found',
        });
      }

      // Check if user already reviewed this professional
      const existingReview = await Review.findOne({
        reviewer: userId,
        professional: professionalUserId,
        reviewType: 'professional',
        isActive: { $ne: false },
      });

      if (existingReview) {
        // Update existing review instead of blocking
        const updatedReview = await Review.findByIdAndUpdate(
          existingReview._id,
          {
            rating: parseInt(rating),
            comment,
          },
          { new: true }
        );

        // Update professional rating
        const allReviews = await Review.find({
          professional: professionalUserId,
          reviewType: 'professional',
          isActive: { $ne: false },
        });

        const avgRating =
          allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

        await User.findByIdAndUpdate(
          professionalUserId,
          {
            rating: avgRating,
            reviewCount: allReviews.length,
          },
          { new: true }
        );

        const populatedReview = await Review.findById(updatedReview._id)
          .populate('reviewer', 'name profileImage')
          .populate('professional', 'name');

        return res.status(200).json({
          success: true,
          message: 'Review updated successfully',
          review: populatedReview,
        });
      }

      reviewData.professional = professionalUserId;
    }

    const review = await Review.create(reviewData);

    // Update rating in product or professional
    if (reviewType === 'product') {
      const allReviews = await Review.find({
        product: productId,
        reviewType: 'product',
        isActive: { $ne: false },
      });

      const avgRating =
        allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
          : 0;

      await Product.findByIdAndUpdate(
        productId,
        {
          rating: avgRating,
          reviewCount: allReviews.length,
        },
        { new: true }
      );
    } else if (reviewType === 'professional') {
      const allReviews = await Review.find({
        professional: professionalUserId,
        reviewType: 'professional',
        isActive: { $ne: false },
      });

      const avgRating =
        allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
          : 0;

      await User.findByIdAndUpdate(
        professionalUserId,
        {
          rating: avgRating,
          reviewCount: allReviews.length,
        },
        { new: true }
      );
    }

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name profileImage')
      .populate('product', 'name')
      .populate('professional', 'name');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: populatedReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const skip = (page - 1) * limit;
    const total = await Review.countDocuments({
      product: productId,
      reviewType: 'product',
      isActive: { $ne: false },
    });

    const reviews = await Review.find({
      product: productId,
      reviewType: 'product',
      isActive: { $ne: false },
    })
      .populate('reviewer', 'name profileImage')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get reviews for a professional
exports.getProfessionalReviews = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    let professionalUserId = professionalId;

    let professional = await User.findById(professionalId);
    if (!professional || professional.userType !== 'professional') {
      const professionalProfile = await Professional.findById(professionalId).populate('userId');
      professionalUserId = professionalProfile?.userId?._id || professionalId;
      professional = professionalProfile?.userId || null;
    }

    if (!professional || professional.userType !== 'professional') {
      return res.status(404).json({
        success: false,
        message: 'Professional not found',
      });
    }

    const skip = (page - 1) * limit;
    const total = await Review.countDocuments({
      professional: professionalUserId,
      reviewType: 'professional',
      isActive: { $ne: false },
    });

    const reviews = await Review.find({
      professional: professionalUserId,
      reviewType: 'professional',
      isActive: { $ne: false },
    })
      .populate('reviewer', 'name profileImage')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all reviews (Admin)
exports.getAllReviews = async (req, res) => {
  try {
    const { reviewType, page = 1, limit = 10 } = req.query;
    let query = { isActive: true };

    if (reviewType) {
      query.reviewType = reviewType;
    }

    const skip = (page - 1) * limit;
    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .populate('reviewer', 'name email')
      .populate('product', 'name')
      .populate('professional', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete review (User or Admin)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check authorization
    if (
      review.reviewer.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review',
      });
    }

    await Review.findByIdAndUpdate(id, { isActive: false });

    // Update rating
    if (review.reviewType === 'product') {
      const allReviews = await Review.find({
        product: review.product,
        reviewType: 'product',
        isActive: true,
      });

      if (allReviews.length === 0) {
        await Product.findByIdAndUpdate(
          review.product,
          { rating: 0, reviewCount: 0 },
          { new: true }
        );
      } else {
        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await Product.findByIdAndUpdate(
          review.product,
          { rating: avgRating, reviewCount: allReviews.length },
          { new: true }
        );
      }
    } else if (review.reviewType === 'professional') {
      const allReviews = await Review.find({
        professional: review.professional,
        reviewType: 'professional',
        isActive: true,
      });

      if (allReviews.length === 0) {
        await User.findByIdAndUpdate(
          review.professional,
          { rating: 0, reviewCount: 0 },
          { new: true }
        );
      } else {
        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await User.findByIdAndUpdate(
          review.professional,
          { rating: avgRating, reviewCount: allReviews.length },
          { new: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
