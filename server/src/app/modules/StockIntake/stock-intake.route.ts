import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { StockIntakeControllers } from './stock-intake.controller';
import { StockIntakeValidations } from './stock-intake.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(StockIntakeValidations.createStockIntakeSchema),
  StockIntakeControllers.createStockIntake
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  StockIntakeControllers.getAllStockIntakes
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  StockIntakeControllers.getStockIntakeById
);

export const stockIntakeRoutes = router;
