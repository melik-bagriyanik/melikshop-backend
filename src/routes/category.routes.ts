import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { adminMiddleware } from '../middleware/auth.middleware';
import { Category } from '../models/category.model';

const router = Router();

// Zod şeması
const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image: z.string().url(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional()
});

// ✅ 1. Çoklu kategori ekleme
router.post(
  '/bulk',
  adminMiddleware,
  validateBody(z.object({ categories: z.array(categorySchema) })),
  asyncHandler(async (req, res) => {
    const { categories } = req.body;

    const insertedCategories = await Category.insertMany(categories);

    res.status(201).json({
      success: true,
      message: 'Categories created successfully',
      data: insertedCategories
    });
  })
);

// ✅ 2. Tüm kategorileri getirme  filtre/sort ile
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { sort = 'sortOrder', order = 'asc', isActive } = req.query;

    const filter: any = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const sortOptions: any = {};
    sortOptions[sort as string] = order === 'desc' ? -1 : 1;

    const categories = await Category.find(filter).sort(sortOptions);

    res.status(200).json({
      success: true,
      data: categories
    });
  })
);

export default router;
