const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
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
};

// Create a new product (Admin only)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, subcategory, subSubcategory, subSubSubcategory, size, stock } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      category,
      subcategory,
      subSubcategory,
      subSubSubcategory,
      size,
      stock: stock || 0,
      createdBy: null,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      products,
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

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update product (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, subcategory, subSubcategory, subSubSubcategory, size, stock } = req.body;

    let product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check authorization - allow if created by this admin or if user is admin
    if (product.createdBy && product.createdBy.toString() !== (req.admin.adminId || req.admin._id) && req.admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product',
      });
    }

    product = await Product.findByIdAndUpdate(
      id,
      { name, description, price, category, subcategory, subSubcategory, subSubSubcategory, size, stock },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete product (Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check authorization - allow if created by this admin or if user is admin
    if (product.createdBy && product.createdBy.toString() !== (req.admin.adminId || req.admin._id) && req.admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product',
      });
    }

    // Delete all images from Cloudinary
    for (const image of product.images) {
      if (image.publicId) {
        await cloudinary.uploader.destroy(image.publicId);
      }
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Upload product images (Admin only)
exports.uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided',
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check authorization - allow if created by this admin or if user is admin
    if (product.createdBy && product.createdBy.toString() !== (req.admin.adminId || req.admin._id) && req.admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload images for this product',
      });
    }

    // Check if max images reached
    if (product.images.length >= product.maxImages) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${product.maxImages} images allowed per product`,
      });
    }

    const remainingSlots = product.maxImages - product.images.length;
    const filesToUpload = files.slice(0, remainingSlots);

    const uploadedImages = [];

    for (const file of filesToUpload) {
      try {
        const result = await uploadBufferToCloudinary(file.buffer, 'products');

        uploadedImages.push({
          url: result.secure_url,
          publicId: result.public_id,
        });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    product.images.push(...uploadedImages);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      images: uploadedImages,
      totalImages: product.images.length,
      maxImages: product.maxImages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete product image (Admin only)
exports.deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { publicId, imageUrl } = req.body;

    if (!publicId && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide publicId or imageUrl',
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check authorization - allow if created by this admin or if user is admin
    if (product.createdBy && product.createdBy.toString() !== (req.admin.adminId || req.admin._id) && req.admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete images for this product',
      });
    }

    // Find and remove the image
    const imageIndex = product.images.findIndex(
      (img) => img.publicId === publicId || img.url === imageUrl
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    const imageToDelete = product.images[imageIndex];

    // Delete from Cloudinary
    if (imageToDelete.publicId) {
      await cloudinary.uploader.destroy(imageToDelete.publicId);
    }

    product.images.splice(imageIndex, 1);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      totalImages: product.images.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get product categories
exports.getProductCategories = async (req, res) => {
  try {
    const { PRODUCT_CATEGORY_HIERARCHY, getMainCategories } = require('../config/productCategoryHierarchy');

    res.status(200).json({
      success: true,
      hierarchy: PRODUCT_CATEGORY_HIERARCHY,
      mainCategories: getMainCategories(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create product order
exports.createProductOrder = async (req, res) => {
  try {
    const ProductOrder = require('../models/ProductOrder');
    const userId = req.user._id;
    const { products, shippingDetails, subtotal, shipping, tax, total, paymentMethod } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products are required',
      });
    }

    if (!shippingDetails) {
      return res.status(400).json({
        success: false,
        message: 'Shipping details are required',
      });
    }

    const productOrder = new ProductOrder({
      customerId: userId,
      products,
      shippingDetails,
      subtotal,
      shipping,
      tax,
      total,
      paymentMethod: paymentMethod === 'online' ? 'razorpay' : 'cod',
      paymentStatus: paymentMethod === 'online' ? 'pending' : 'pending',
      orderStatus: 'confirmed',
    });

    await productOrder.save();

    res.status(201).json({
      success: true,
      message: 'Product order created successfully',
      data: {
        orderId: productOrder._id,
        total: productOrder.total,
      },
    });
  } catch (error) {
    console.error('Error creating product order:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
