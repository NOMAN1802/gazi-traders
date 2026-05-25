import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { SupplierControllers } from './supplier.controller';
import { SupplierValidations } from './supplier.validation';

const router = express.Router();

router.post(
    '/',
    auth(USER_ROLE.admin, USER_ROLE.manager),
    validateRequest(SupplierValidations.createSupplierValidationSchema),
    SupplierControllers.createSupplier
);

router.get(
    '/',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    SupplierControllers.getSuppliers
);

router.get(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    SupplierControllers.getSupplier
);

router.patch(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager),
    validateRequest(SupplierValidations.updateSupplierValidationSchema),
    SupplierControllers.updateSupplier
);

router.delete(
    '/:id',
    auth(USER_ROLE.admin),
    SupplierControllers.deleteSupplier
);

export const supplierRoutes = router;

