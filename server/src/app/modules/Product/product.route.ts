import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../User/user.constant';
import { productValidations } from './product.validation';
import { ProductControllers } from './product.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(productValidations.createProductSchema),
  ProductControllers.createProduct
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  ProductControllers.getProducts
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  ProductControllers.getProduct
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(productValidations.updateProductSchema),
  ProductControllers.updateProduct
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  ProductControllers.deleteProduct
);

export const productRoutes = router;
