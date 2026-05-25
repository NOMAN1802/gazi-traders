import { Damage } from "../Damage/damage.model";
import { Expense } from "../Expense/expense.model";
import { Order } from "../Order/order.model";
import { Product } from "../Product/product.model";
import { Return } from "../Return/return.model";

const getAdminDashboard = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    const createdAtFilter: Record<string, unknown> = {};
    if (startDate) createdAtFilter.$gte = startDate;
    if (endDate) createdAtFilter.$lte = endDate;
    dateFilter.createdAt = createdAtFilter;
  }

  // Total products and low stock
  const productFilter = { isDeleted: false };
  const totalProducts = await Product.countDocuments(productFilter);
  const lowStockProducts = await Product.countDocuments({
    ...productFilter,
    stockQuantity: { $lte: 10 },
  });
  const outOfStockProducts = await Product.countDocuments({
    ...productFilter,
    stockQuantity: 0,
  });

  // Calculate total stock value
  const stockValueData = await Product.aggregate([
    { $match: productFilter },
    {
      $group: {
        _id: null,
        totalStockValue: {
          $sum: { $multiply: ['$stockQuantity', '$purchasePrice'] }
        },
      },
    },
  ]);
  const totalStockValue = stockValueData[0]?.totalStockValue || 0;

  // Orders statistics
  const totalOrders = await Order.countDocuments(dateFilter);
  const completedOrders = await Order.countDocuments({
    ...dateFilter,
    status: "completed",
  });
  const pendingOrders = await Order.countDocuments({
    ...dateFilter,
    status: "pending",
  });
  const partialOrders = await Order.countDocuments({
    ...dateFilter,
    status: "partial",
  });

  // Revenue calculation
  const revenueData = await Order.aggregate([
    { $match: { ...dateFilter, status: "completed" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        totalDiscount: { $sum: "$discount" },
        totalTax: { $sum: "$tax" },
      },
    },
  ]);

  // Outstanding balance calculation (pending + partial orders)
  const outstandingData = await Order.aggregate([
    {
      $match: {
        ...dateFilter,
        status: { $in: ["pending", "partial"] },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalOutstanding: {
          $sum: {
            $subtract: ["$totalAmount", { $ifNull: ["$paidAmount", 0] }]
          }
        },
      },
    },
  ]);

  // Expenses
  const expenseData = await Expense.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: "$amount" },
      },
    },
  ]);

  // Returns and Damages
  const totalReturns = await Return.countDocuments(dateFilter);
  const totalDamages = await Damage.countDocuments(dateFilter);

  const returnValue = await Return.aggregate([
    { $match: dateFilter },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $group: {
        _id: null,
        totalValue: {
          $sum: { $multiply: ["$quantity", "$productInfo.sellingPrice"] },
        },
      },
    },
  ]);

  const damageValue = await Damage.aggregate([
    { $match: dateFilter },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $group: {
        _id: null,
        totalValue: {
          $sum: { $multiply: ["$quantity", "$productInfo.purchasePrice"] },
        },
      },
    },
  ]);

  // Count unique customers from orders
  const uniqueCustomers = await Order.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$customer.name',
      },
    },
    {
      $count: 'total',
    },
  ]);
  const totalCustomers = uniqueCustomers[0]?.total || 0;

  // Calculate profit/loss
  const revenue = revenueData[0]?.totalRevenue || 0;
  const expenses = expenseData[0]?.totalExpenses || 0;
  const profit = revenue - expenses;

  // Recent orders
  const recentOrders = await Order.find(dateFilter)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("createdBy", "name");

  // Top selling products (sorted by highest revenue/amount)
  const topProducts = await Order.aggregate([
    { $match: { ...dateFilter, status: "completed", isDeleted: false } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        productName: { $first: "$items.productName" },
        totalQuantity: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 6 },
  ]);

  // Recent user activities
  const recentOrderActivities = await Order.aggregate([
    { $match: dateFilter },
    { $sort: { createdAt: -1 } },
    { $limit: 20 },
    { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
    { $unwind: '$creator' },
    {
      $project: {
        type: 'order',
        action: '$status',
        user: '$creator.name',
        timestamp: '$createdAt',
        details: { orderNumber: '$orderNumber', totalAmount: '$totalAmount' }
      }
    }
  ]);

  const recentReturnActivities = await Return.aggregate([
    { $match: dateFilter },
    { $sort: { createdAt: -1 } },
    { $limit: 20 },
    { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
    { $unwind: '$creator' },
    {
      $project: {
        type: 'return',
        action: 'created',
        user: '$creator.name',
        timestamp: '$createdAt',
        details: { productName: '$productName', quantity: '$quantity', reason: '$reason' }
      }
    }
  ]);

  const recentDamageActivities = await Damage.aggregate([
    { $match: dateFilter },
    { $sort: { createdAt: -1 } },
    { $limit: 20 },
    { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creator' } },
    { $unwind: '$creator' },
    {
      $project: {
        type: 'damage',
        action: 'reported',
        user: '$creator.name',
        timestamp: '$createdAt',
        details: { productName: '$productName', quantity: '$quantity', reason: '$reason' }
      }
    }
  ]);

  const allActivities = [...recentOrderActivities, ...recentReturnActivities, ...recentDamageActivities]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

  return {
    inventory: {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue,
    },
    orders: {
      total: totalOrders,
      completed: completedOrders,
      pending: pendingOrders,
      partial: partialOrders,
    },
    financial: {
      revenue,
      expenses,
      profit,
      discount: revenueData[0]?.totalDiscount || 0,
      tax: revenueData[0]?.totalTax || 0,
      outstanding: outstandingData[0]?.totalOutstanding || 0,
    },
    returns: {
      count: totalReturns,
      value: returnValue[0]?.totalValue || 0,
    },
    damages: {
      count: totalDamages,
      value: damageValue[0]?.totalValue || 0,
    },
    users: {
      total: totalCustomers,
    },
    recentOrders,
    topProducts,
    activities: allActivities,
  };
};

const getManagerDashboard = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, any> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) (dateFilter.createdAt as any).$gte = startDate;
    if (endDate) (dateFilter.createdAt as any).$lte = endDate;
  }

  // Products
  const totalProducts = await Product.countDocuments({ isDeleted: false });
  const lowStockProducts = await Product.countDocuments({
    isDeleted: false,
    stockQuantity: { $lte: 10 },
  });

  // Orders
  const totalOrders = await Order.countDocuments(dateFilter);
  const completedOrders = await Order.countDocuments({
    ...dateFilter,
    status: "completed",
  });
  const pendingOrders = await Order.countDocuments({
    ...dateFilter,
    status: "pending",
  });

  // Revenue
  const revenueData = await Order.aggregate([
    { $match: { ...dateFilter, status: "completed" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  // Returns and Damages
  const totalReturns = await Return.countDocuments(dateFilter);
  const totalDamages = await Damage.countDocuments(dateFilter);

  // Recent orders
  const recentOrders = await Order.find(dateFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("createdBy", "name");

  return {
    inventory: {
      totalProducts,
      lowStockProducts,
    },
    orders: {
      total: totalOrders,
      completed: completedOrders,
      pending: pendingOrders,
    },
    revenue: revenueData[0]?.totalRevenue || 0,
    returns: totalReturns,
    damages: totalDamages,
    recentOrders,
  };
};

const getStaffDashboard = async () => {
  // Quick stats for staff
  const totalProducts = await Product.countDocuments({ isDeleted: false });
  const lowStockProducts = await Product.countDocuments({
    isDeleted: false,
    stockQuantity: { $lte: 10 },
  });
  const todayOrders = await Order.countDocuments({
    createdAt: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  });

  return {
    totalProducts,
    lowStockProducts,
    todayOrders,
  };
};

export const DashboardServices = {
  getAdminDashboard,
  getManagerDashboard,
  getStaffDashboard,
};
