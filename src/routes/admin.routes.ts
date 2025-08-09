import { Router } from 'express';
import { adminMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { Order } from '../models/order.model';
import { User } from '../models/user.model';
import { Product } from '../models/product.model';

const router = Router();

// Admin Dashboard Overview
router.get('/dashboard/overview',
  adminMiddleware,
  asyncHandler(async (_req, res) => {
    const [
      totalOrders,
      paidOrdersAgg,
      customerCount,
      totalSalesAgg,
      recentOrders,
      popularProducts,
      salesTrend,
      statusDistribution
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ isPaid: true }),
      User.countDocuments({}),
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.find({})
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(10),
      Product.find({ isActive: true })
        .sort({ reviewCount: -1, rating: -1 })
        .limit(10)
        .select('name price category brand rating reviewCount thumbnail'),
      // Sales trend (last 30 days)
      Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } }
      ]),
      // Order status distribution
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          totalSales: totalSalesAgg[0]?.total || 0,
          totalOrders,
          paidOrders: paidOrdersAgg,
          customerCount
        },
        recentOrders,
        popularProducts,
        charts: {
          salesTrend,
          statusDistribution
        }
      }
    });
  })
);

export default router;


