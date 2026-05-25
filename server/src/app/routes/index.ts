import express from 'express';
import { AuthRoutes } from '../modules/Auth/auth.route';
import { userRoutes } from '../modules/User/user.route';
import { productRoutes } from '../modules/Product/product.route';
import { orderRoutes } from '../modules/Order/order.route';
import { returnRoutes } from '../modules/Return/return.route';
import { refundRoutes } from '../modules/Refund/refund.route';
import { damageRoutes } from '../modules/Damage/damage.route';
import { expenseRoutes } from '../modules/Expense/expense.route';
import { dashboardRoutes } from '../modules/Dashboard/dashboard.route';
import { reportsRoutes } from '../modules/Reports/reports.route';
import { categoryRoutes } from '../modules/Category/category.route';
import { unitRoutes } from '../modules/Unit/unit.route';
import { supplierRoutes } from '../modules/Supplier/supplier.route';
import { purchaseRoutes } from '../modules/Purchase/purchase.route';
import { pendingProductRoutes } from '../modules/PendingProduct/pending-product.route';
import { customerRoutes } from '../modules/Customer/customer.route';
import { dueBillRoutes } from '../modules/DueBill/due-bill.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/categories',
    route: categoryRoutes,
  },
  {
    path: '/units',
    route: unitRoutes,
  },
  {
    path: '/suppliers',
    route: supplierRoutes,
  },
  {
    path: '/products',
    route: productRoutes,
  },
  {
    path: '/orders',
    route: orderRoutes,
  },
  {
    path: '/returns',
    route: returnRoutes,
  },
  {
    path: '/refunds',
    route: refundRoutes,
  },
  {
    path: '/damages',
    route: damageRoutes,
  },
  {
    path: '/expenses',
    route: expenseRoutes,
  },
  {
    path: '/dashboard',
    route: dashboardRoutes,
  },
  {
    path: '/reports',
    route: reportsRoutes,
  },
  {
    path: '/purchases',
    route: purchaseRoutes,
  },
  {
    path: '/pending-products',
    route: pendingProductRoutes,
  },
  {
    path: '/customers',
    route: customerRoutes,
  },
  {
    path: '/due-bills',
    route: dueBillRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
