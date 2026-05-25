import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { UnitControllers } from './unit.controller';
import { UnitValidations } from './unit.validation';

const router = express.Router();

router.post(
    '/',
    auth(USER_ROLE.admin),
    validateRequest(UnitValidations.createUnitValidationSchema),
    UnitControllers.createUnit
);

router.get(
    '/',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    UnitControllers.getUnits
);

router.get(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    UnitControllers.getUnit
);

router.patch(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager),
    validateRequest(UnitValidations.updateUnitValidationSchema),
    UnitControllers.updateUnit
);

router.delete(
    '/:id',
    auth(USER_ROLE.admin),
    UnitControllers.deleteUnit
);

export const unitRoutes = router;

