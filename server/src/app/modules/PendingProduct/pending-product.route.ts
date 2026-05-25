import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { PendingProductControllers } from './pending-product.controller';
import { PendingProductValidations } from './pending-product.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(PendingProductValidations.createPendingProductsSchema),
  PendingProductControllers.createPendingProducts
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  PendingProductControllers.getAllPendingProducts
);

router.get(
  '/stats',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  PendingProductControllers.getPendingProductStats
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(PendingProductValidations.updatePendingProductSchema),
  PendingProductControllers.updatePendingProduct
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager),
  PendingProductControllers.deletePendingProduct
);

export const pendingProductRoutes = router;
