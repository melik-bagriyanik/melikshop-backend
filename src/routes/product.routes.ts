import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { uploadMultiple, handleUploadError } from '../services/upload.service';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  productIdSchema,
  productReviewSchema
} from '../validations/product.validation';
import { Product } from '../models/product.model';
import { User } from '../models/user.model';
import { z } from 'zod';

const router = Router();

// Get all products (public)
router.get('/',
  optionalAuthMiddleware,
  validateQuery(productQuerySchema),
  asyncHandler(async (req, res) => {
    const { 
      page, 
      limit, 
      search, 
      category, 
      brand, 
      minPrice, 
      maxPrice, 
      sortBy, 
      sortOrder, 
      isActive, 
      isFeatured 
    } = req.query;

    // Build query
    const query: any = { isActive: true };
    
    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = brand;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = minPrice;
      if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

// Get product by ID (public)
router.get('/:id',
  optionalAuthMiddleware,
  validateParams(productIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('createdBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is active (unless admin)
    if (!product.isActive && req.user?.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        product
      }
    });
  })
);

// Create product (admin only)
router.post('/',
  adminMiddleware,
  uploadMultiple,
  handleUploadError,
  validateBody(createProductSchema),
  asyncHandler(async (req, res) => {
    const productData = req.body;
    const files = req.files as Express.Multer.File[];

    // Handle image uploads
    if (files && files.length > 0) {
      const imageUrls = files.map(file => `/uploads/images/${file.filename}`);
      productData.images = imageUrls;
      productData.thumbnail = imageUrls[0]; // Use first image as thumbnail
    }

    // Add creator information
    productData.createdBy = req.user!._id;

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: populatedProduct
      }
    });
  })
);

//çoklu ürünleri yükleme (admin only)
router.post('/bulk',
  adminMiddleware,
  uploadMultiple,
  handleUploadError,
  validateBody(z.object({
    products: z.array(createProductSchema)
  })),
  asyncHandler(async (req, res) => {
    const { products } = req.body;
    const files = req.files as Express.Multer.File[];

    // Handle image uploads for each product
    const productsWithImages = products.map((product: any, index: number) => {
      if (files && files[index]) {
        product.images = [`/uploads/images/${files[index].filename}`];
        product.thumbnail = product.images[0]; // Use first image as thumbnail
      }
      product.createdBy = req.user!._id; // Add creator information
      return product;
    });

    const createdProducts = await Product.insertMany(productsWithImages);

    res.status(201).json({
      success: true,
      message: 'Products created successfully',
      data: {
        products: createdProducts.map(product => ({
          id: product._id,
          name: product.name,
          price: product.price,
          category: product.category,
          brand: product.brand,
          images: product.images,
          thumbnail: product.thumbnail,
          createdBy: {
            id: product.createdBy._id,
            firstName: product.createdBy.firstName,
            lastName: product.createdBy.lastName
          }
        }))
      }
    });
  })
);


// Update product (admin only)
router.put('/:id',
  adminMiddleware,
  uploadMultiple,
  handleUploadError,
  validateParams(productIdSchema),
  validateBody(updateProductSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const files = req.files as Express.Multer.File[];

    // Handle image uploads
    if (files && files.length > 0) {
      const imageUrls = files.map(file => `/uploads/images/${file.filename}`);
      updates.images = imageUrls;
      if (!updates.thumbnail) {
        updates.thumbnail = imageUrls[0];
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product
      }
    });
  })
);

// Delete product (admin only)
router.delete('/:id',
  adminMiddleware,
  validateParams(productIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  })
);

// Toggle product active status (admin only)
router.patch('/:id/toggle-status',
  adminMiddleware,
  validateParams(productIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        product: {
          id: product._id,
          name: product.name,
          isActive: product.isActive
        }
      }
    });
  })
);

// Toggle product featured status (admin only)
router.patch('/:id/toggle-featured',
  adminMiddleware,
  validateParams(productIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isFeatured = !product.isFeatured;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: {
        product: {
          id: product._id,
          name: product.name,
          isFeatured: product.isFeatured
        }
      }
    });
  })
);

// Add product review (authenticated users)
router.post('/:id/reviews',
  authMiddleware,
  validateParams(productIdSchema),
  validateBody(productReviewSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user!._id;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews?.find(
      (review: any) => review.user.toString() === userId.toString()
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    if (!product.reviews) {
      product.reviews = [];
    }

    product.reviews.push({
      user: userId,
      rating,
      comment,
      createdAt: new Date()
    });

    // Update product rating
    const totalRating = product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
    product.rating = totalRating / product.reviews.length;
    product.reviewCount = product.reviews.length;

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: {
        rating: product.rating,
        reviewCount: product.reviewCount
      }
    });
  })
);

// Get product categories (public)
router.get('/categories/list',
  asyncHandler(async (req, res) => {
    const categories = await Product.distinct('category');
    
    res.json({
      success: true,
      data: {
        categories
      }
    });
  })
);

// Get product brands (public)
router.get('/brands/list',
  asyncHandler(async (req, res) => {
    const brands = await Product.distinct('brand');
    
    res.json({
      success: true,
      data: {
        brands: brands.filter(brand => brand) // Remove null/undefined values
      }
    });
  })
);

// Get featured products (public)
router.get('/featured/list',
  asyncHandler(async (req, res) => {
    const featuredProducts = await Product.find({ 
      isActive: true, 
      isFeatured: true 
    })
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: {
        products: featuredProducts
      }
    });
  })
);

// Get product statistics (admin only)
router.get('/stats/overview',
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });
    const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 } });

    // Products created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentProducts = await Product.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Average product rating
    const avgRating = await Product.aggregate([
      { $match: { rating: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        featuredProducts,
        lowStockProducts,
        recentProducts,
        averageRating: avgRating.length > 0 ? Math.round(avgRating[0].avgRating * 10) / 10 : 0
      }
    });
  })
);

export default router; 