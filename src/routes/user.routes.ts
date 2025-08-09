import { Router } from 'express';
import { validateQuery, validateParams } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { adminMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';
import { User } from '../models/user.model';
import { Order } from '../models/order.model';

const router = Router();

// Get all users (admin only)
router.get('/',
  adminMiddleware,
  validateQuery(z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).default('10'),
    search: z.string().trim().optional(),
    role: z.enum(['user', 'admin']).optional(),
    isEmailVerified: z.string().transform((val) => val === 'true').optional(),
    sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })),
  asyncHandler(async (req, res) => {
    const { page, limit, search, role, isEmailVerified, sortBy, sortOrder } = req.query;

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isEmailVerified !== undefined) {
      query.isEmailVerified = isEmailVerified;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Compute order counts for users on this page
    const userIds = users.map((u: any) => u._id);
    const orderCountsAgg = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);
    const userIdToOrderCount = new Map<string, number>(
      orderCountsAgg.map((it: any) => [String(it._id), it.count])
    );

    const usersWithOrderCount = users.map((u: any) => ({
      ...u,
      orderCount: userIdToOrderCount.get(String(u._id)) || 0
    }));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users: usersWithOrderCount,
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

// Get user by ID (admin only)
router.get('/:id',
  adminMiddleware,
  validateParams(z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const orderCount = await Order.countDocuments({ user: user._id });

    res.json({
      success: true,
      data: {
        user: { ...user, orderCount }
      }
    });
  })
);

// Update user (admin only)
router.put('/:id',
  adminMiddleware,
  validateParams(z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.password;
    delete updates.emailVerificationToken;
    delete updates.passwordResetToken;
    delete updates.passwordResetExpires;

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user
      }
    });
  })
);

// Delete user (admin only)
router.delete('/:id',
  adminMiddleware,
  validateParams(z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  })
);

// Toggle user active status (admin only)
router.patch('/:id/toggle-status',
  adminMiddleware,
  validateParams(z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating admin users
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate admin users'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  })
);

// Get user statistics (admin only)
router.get('/stats/overview',
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    // Users created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        activeUsers,
        adminUsers,
        recentUsers,
        verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0
      }
    });
  })
);

export default router; 