import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { CustomerControllers } from './customer.controller';
import { CustomerValidations } from './customer.validation';

const router = express.Router();

router.post(
    '/',
    auth(USER_ROLE.admin, USER_ROLE.manager),
    validateRequest(CustomerValidations.createCustomerValidationSchema),
    CustomerControllers.createCustomer
);

router.get(
    '/',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    CustomerControllers.getCustomers
);

router.get(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    CustomerControllers.getCustomer
);

router.patch(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager),
    validateRequest(CustomerValidations.updateCustomerValidationSchema),
    CustomerControllers.updateCustomer
);

router.delete(
    '/:id',
    auth(USER_ROLE.admin),
    CustomerControllers.deleteCustomer
);

export const customerRoutes = router;
