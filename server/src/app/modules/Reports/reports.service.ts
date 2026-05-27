import { Damage } from "../Damage/damage.model";
import { Expense } from "../Expense/expense.model";
import { Order } from "../Order/order.model";
import { Product } from "../Product/product.model";
import { Return } from "../Return/return.model";
import { StockIntake } from "../StockIntake/stock-intake.model";

const getStockReport = async () => {
  const products = await Product.find({ isDeleted: false }).sort({
    stockQuantity: 1,
  });

  const summary = {
    totalProducts: products.length,
    totalStockValue: products.reduce(
      (sum, p) => sum + p.stockQuantity * (p.purchasePrice ?? 0),
      0
    ),
    lowStockItems: products.filter((p) => p.stockQuantity <= 10).length,
    outOfStockItems: products.filter((p) => p.stockQuantity === 0).length,
  };

  return {
    summary,
    products,
  };
};

const getOrderReport = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, any> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) (dateFilter.createdAt as any).$gte = startDate;
    if (endDate) (dateFilter.createdAt as any).$lte = endDate;
  }

  const orders = await Order.find(dateFilter)
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  const summary = {
    totalOrders: orders.length,
    completedOrders: orders.filter((o) => o.status === "completed").length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    partialOrders: orders.filter((o) => o.status === "partial").length,
    totalRevenue: orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.totalAmount, 0),
  };

  return {
    summary,
    orders,
  };
};

const getDamageReport = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, any> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) (dateFilter.createdAt as any).$gte = startDate;
    if (endDate) (dateFilter.createdAt as any).$lte = endDate;
  }

  const damages = await Damage.find(dateFilter)
    .populate({
      path: "items.product",
      select: "name categoryName purchasePrice",
    })
    .populate("items.supplier", "name")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  // Get supplier information from expenses for each damage item
  const damagesWithSupplier = await Promise.all(
    damages.map(async (damage) => {
      const damageObj: any = damage.toObject();

      // Process items to add supplier information if not already present
      if (damageObj.items && Array.isArray(damageObj.items)) {
        for (const item of damageObj.items) {
          // If item doesn't have supplier, try to get it from expenses
          if (!item.supplier && item.product) {
            const productId = item.product?._id || item.product;
            if (productId) {
              const expense = await Expense.findOne({
                referenceId: productId,
                referenceModel: "Product",
                category: "product_purchase",
              })
                .populate("supplier", "name")
                .sort({ createdAt: -1 })
                .limit(1);

              if (expense && expense.supplier) {
                item.supplier = expense.supplier;
              }
            }
          }
        }
      }

      return damageObj;
    })
  );

  // Calculate summary using aggregation with correct structure
  const damageValue = await Damage.aggregate([
    { $match: dateFilter },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        totalValue: {
          $sum: "$items.totalLoss",
        },
        totalQuantity: { $sum: "$items.quantity" },
      },
    },
  ]);

  const summary = {
    totalDamages: damages.length,
    totalQuantity: damageValue[0]?.totalQuantity || 0,
    totalValue: damageValue[0]?.totalValue || 0,
  };

  return {
    summary,
    damages: damagesWithSupplier,
  };
};

const getReturnReport = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, any> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) (dateFilter.createdAt as any).$gte = startDate;
    if (endDate) (dateFilter.createdAt as any).$lte = endDate;
  }

  const returns = await Return.find(dateFilter)
    .populate("items.product")
    .populate("order")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  // Get supplier information from expenses for each return item
  const returnsWithSupplier = await Promise.all(
    returns.map(async (returnEntry) => {
      const returnObj: any = returnEntry.toObject();

      // Process each item in the return
      if (returnObj.items && Array.isArray(returnObj.items)) {
        for (const item of returnObj.items) {
          const productId = item.product?._id || item.product;

          if (productId) {
            // Find the most recent expense for this product to get supplier
            const expense = await Expense.findOne({
              referenceId: productId,
              referenceModel: "Product",
              category: "product_purchase",
            })
              .populate("supplier", "name")
              .sort({ createdAt: -1 })
              .limit(1);

            // Add supplier to product if expense has supplier
            if (expense && expense.supplier) {
              if (typeof item.product === 'object') {
                item.product = {
                  ...item.product,
                  supplier: expense.supplier,
                };
              }
            }
          }
        }
      }

      return returnObj;
    })
  );

  const returnValue = await Return.aggregate([
    { $match: dateFilter },
    { $unwind: "$items" },
    {
      $group: {
        _id: null,
        totalValue: {
          $sum: "$items.totalPrice",
        },
        totalQuantity: { $sum: "$items.quantity" },
      },
    },
  ]);

  const summary = {
    totalReturns: returns.length,
    totalQuantity: returnValue[0]?.totalQuantity || 0,
    totalValue: returnValue[0]?.totalValue || 0,
  };

  return {
    summary,
    returns: returnsWithSupplier,
  };
};

const getExpenseReport = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, any> = {};
  if (startDate || endDate) {
    dateFilter.date = {};
    if (startDate) (dateFilter.date as any).$gte = startDate;
    if (endDate) (dateFilter.date as any).$lte = endDate;
  }

  const expenses = await Expense.find(dateFilter)
    .populate("createdBy", "name")
    .populate("supplier", "name")
    .sort({ date: -1 });

  // Populate product information for expenses with referenceModel = "Product"
  const expensesWithProduct = await Promise.all(
    expenses.map(async (expense) => {
      const expenseObj: any = expense.toObject();

      if (expense.referenceModel === "Product" && expense.referenceId) {
        const product = await Product.findById(expense.referenceId).select("categoryName purchasePrice name");
        if (product) {
          expenseObj.referenceId = product.toObject();
        }
      }

      return expenseObj;
    })
  );

  const byCategory = await Expense.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  const summary = {
    totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    totalCount: expenses.length,
    byCategory,
  };

  return {
    summary,
    expenses: expensesWithProduct,
  };
};

const getRevenueReport = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, any> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) (dateFilter.createdAt as any).$gte = startDate;
    if (endDate) (dateFilter.createdAt as any).$lte = endDate;
  }

  const revenueData = await Order.aggregate([
    { $match: { ...dateFilter, status: "completed" } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        totalRevenue: { $sum: "$totalAmount" },
        totalDiscount: { $sum: "$discount" },
        totalTax: { $sum: "$tax" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
  ]);

  const summary = {
    totalRevenue: revenueData.reduce((sum, d) => sum + d.totalRevenue, 0),
    totalOrders: revenueData.reduce((sum, d) => sum + d.orderCount, 0),
    totalDiscount: revenueData.reduce((sum, d) => sum + d.totalDiscount, 0),
    totalTax: revenueData.reduce((sum, d) => sum + d.totalTax, 0),
  };

  return {
    summary,
    dailyRevenue: revenueData,
  };
};

const getFinancialSummary = async (startDate?: Date, endDate?: Date) => {
  const dateFilter: Record<string, any> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) (dateFilter.createdAt as any).$gte = startDate;
    if (endDate) (dateFilter.createdAt as any).$lte = endDate;
  }

  // Revenue
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

  // Expenses
  const expenseFilter: Record<string, any> = {};
  if (startDate || endDate) {
    expenseFilter.date = {};
    if (startDate) (expenseFilter.date as any).$gte = startDate;
    if (endDate) (expenseFilter.date as any).$lte = endDate;
  }

  const expenseData = await Expense.aggregate([
    { $match: expenseFilter },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: "$amount" },
      },
    },
  ]);

  const revenue = revenueData[0]?.totalRevenue || 0;
  const expenses = expenseData[0]?.totalExpenses || 0;
  const profit = revenue - expenses;

  return {
    revenue,
    expenses,
    profit,
    profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0,
    discount: revenueData[0]?.totalDiscount || 0,
    tax: revenueData[0]?.totalTax || 0,
  };
};

const getDailyStock = async (date: string) => {
  const target = new Date(date);
  const startOfDay = new Date(target);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(target);
  endOfDay.setHours(23, 59, 59, 999);

  const [products, intakeOn, intakeAfter, ordersOn, ordersAfter] = await Promise.all([
    Product.find({ isDeleted: false }).sort({ name: 1 }),

    StockIntake.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay }, isDeleted: false } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', total: { $sum: '$items.receivedPieces' } } },
    ]),

    StockIntake.aggregate([
      { $match: { createdAt: { $gt: endOfDay }, isDeleted: false } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', total: { $sum: '$items.receivedPieces' } } },
    ]),

    Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay }, isDeleted: false } },
      { $unwind: '$items' },
      { $group: {
        _id: { product: '$items.product', customer: '$customer.name' },
        qty: { $sum: '$items.quantity' },
      }},
    ]),

    Order.aggregate([
      { $match: { createdAt: { $gt: endOfDay }, isDeleted: false } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', total: { $sum: '$items.quantity' } } },
    ]),
  ]);

  const intakeOnMap = new Map<string, number>(intakeOn.map((r: any) => [r._id.toString(), r.total]));
  const intakeAfterMap = new Map<string, number>(intakeAfter.map((r: any) => [r._id.toString(), r.total]));
  const salesAfterMap = new Map<string, number>(ordersAfter.map((r: any) => [r._id.toString(), r.total]));

  const deliveriesMap = new Map<string, Map<string, number>>();
  const customerSet = new Set<string>();
  for (const r of ordersOn) {
    const pid = r._id.product.toString();
    const cname = r._id.customer as string;
    customerSet.add(cname);
    if (!deliveriesMap.has(pid)) deliveriesMap.set(pid, new Map());
    deliveriesMap.get(pid)!.set(cname, r.qty);
  }
  const customers = Array.from(customerSet).sort();

  const rows = products.map((p) => {
    const pid = p._id!.toString();
    const stockInOnDate = intakeOnMap.get(pid) ?? 0;
    const stockInAfterDate = intakeAfterMap.get(pid) ?? 0;
    const salesAfterDate = salesAfterMap.get(pid) ?? 0;
    const customerDeliveries = deliveriesMap.get(pid) ?? new Map<string, number>();
    const totalDelivery = Array.from(customerDeliveries.values()).reduce((s, v) => s + v, 0);

    // previousStock = currentStock - stockInOnDate + totalDelivery - stockInAfterDate + salesAfterDate
    const previousStock = Math.max(0, p.stockQuantity - stockInOnDate + totalDelivery - stockInAfterDate + salesAfterDate);
    const total = previousStock + stockInOnDate;
    const balance = total - totalDelivery;

    const deliveries: Record<string, number> = {};
    customers.forEach((c) => { deliveries[c] = customerDeliveries.get(c) ?? 0; });

    return {
      _id: pid,
      name: p.name,
      cartoonSize: p.cartoonSize ?? null,
      unit: p.unit,
      previousStock,
      stockIn: stockInOnDate,
      total,
      deliveries,
      totalDelivery,
      balance: Math.max(0, balance),
    };
  }).filter((r) => r.previousStock > 0 || r.stockIn > 0 || r.totalDelivery > 0);

  return { date, customers, products: rows };
};

export const ReportsServices = {
  getStockReport,
  getOrderReport,
  getDamageReport,
  getReturnReport,
  getExpenseReport,
  getRevenueReport,
  getFinancialSummary,
  getDailyStock,
};
