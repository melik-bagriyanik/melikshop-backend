import { z } from 'zod';

// Create product validation schema
export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name cannot exceed 200 characters')
    .trim(),
  description: z
    .string()
    .min(1, 'Product description is required')
    .max(2000, 'Description cannot exceed 2000 characters'),
  price: z
    .number()
    .positive('Price must be positive'),
  originalPrice: z
    .number()
    .positive('Original price must be positive')
    .optional(),
  category: z
    .string()
    .min(1, 'Product category is required')
    .trim(),
  subcategory: z
    .string()
    .trim()
    .optional(),
  brand: z
    .string()
    .trim()
    .optional(),
  images: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one image is required')
    .max(10, 'Cannot exceed 10 images'),
  thumbnail: z
    .string()
    .url('Invalid thumbnail URL')
    .min(1, 'Product thumbnail is required'),
  stock: z
    .number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative'),
  sku: z
    .string()
    .min(1, 'Product SKU is required')
    .trim(),
  tags: z
    .array(z.string().trim())
    .optional(),
  specifications: z
    .record(z.any())
    .optional(),
  isActive: z
    .boolean()
    .optional(),
  isFeatured: z
    .boolean()
    .optional(),
  weight: z
    .number()
    .positive('Weight must be positive')
    .optional(),
  dimensions: z.object({
    length: z.number().positive('Length must be positive'),
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
  }).optional(),
});

// Update product validation schema
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name cannot exceed 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .min(1, 'Product description is required')
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  price: z
    .number()
    .positive('Price must be positive')
    .optional(),
  originalPrice: z
    .number()
    .positive('Original price must be positive')
    .optional(),
  category: z
    .string()
    .min(1, 'Product category is required')
    .trim()
    .optional(),
  subcategory: z
    .string()
    .trim()
    .optional(),
  brand: z
    .string()
    .trim()
    .optional(),
  images: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one image is required')
    .max(10, 'Cannot exceed 10 images')
    .optional(),
  thumbnail: z
    .string()
    .url('Invalid thumbnail URL')
    .min(1, 'Product thumbnail is required')
    .optional(),
  stock: z
    .number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative')
    .optional(),
  sku: z
    .string()
    .min(1, 'Product SKU is required')
    .trim()
    .optional(),
  tags: z
    .array(z.string().trim())
    .optional(),
  specifications: z
    .record(z.any())
    .optional(),
  isActive: z
    .boolean()
    .optional(),
  isFeatured: z
    .boolean()
    .optional(),
  weight: z
    .number()
    .positive('Weight must be positive')
    .optional(),
  dimensions: z.object({
    length: z.number().positive('Length must be positive'),
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
  }).optional(),
});

// Product query validation schema
export const productQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .pipe(z.number().min(1, 'Page must be at least 1'))
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100'))
    .default('10'),
  search: z
    .string()
    .trim()
    .optional(),
  category: z
    .string()
    .trim()
    .optional(),
  brand: z
    .string()
    .trim()
    .optional(),
  minPrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Min price must be a number')
    .transform(Number)
    .pipe(z.number().min(0, 'Min price cannot be negative'))
    .optional(),
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Max price must be a number')
    .transform(Number)
    .pipe(z.number().min(0, 'Max price cannot be negative'))
    .optional(),
  sortBy: z
    .enum(['name', 'price', 'rating', 'createdAt'])
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  isFeatured: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

// Product ID validation schema
export const productIdSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format'),
});

// Product review validation schema
export const productReviewSchema = z.object({
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  comment: z
    .string()
    .min(1, 'Comment is required')
    .max(500, 'Comment cannot exceed 500 characters')
    .trim(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ProductIdInput = z.infer<typeof productIdSchema>;
export type ProductReviewInput = z.infer<typeof productReviewSchema>; 