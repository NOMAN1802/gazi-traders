import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { DueBillControllers } from './due-bill.controller';
import { DueBillValidations } from './due-bill.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(DueBillValidations.createDueBillValidationSchema),
  DueBillControllers.createDueBill
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  DueBillControllers.getAllDueBills
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  DueBillControllers.getDueBillById
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(DueBillValidations.updateDueBillValidationSchema),
  DueBillControllers.updateDueBill
);

router.post(
  '/:id/pay',
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(DueBillValidations.payDueBillValidationSchema),
  DueBillControllers.payDueBill
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.manager),
  DueBillControllers.deleteDueBill
);

export const dueBillRoutes = router;
