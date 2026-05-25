import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { CategoryControllers } from './category.controller';
import { CategoryValidations } from './category.validation';

const router = express.Router();

router.post(
    '/',
    auth(USER_ROLE.admin),
    validateRequest(CategoryValidations.createCategoryValidationSchema),
    CategoryControllers.createCategory
);

router.get(
    '/',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    CategoryControllers.getCategories
);

router.get(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
    CategoryControllers.getCategory
);

router.patch(
    '/:id',
    auth(USER_ROLE.admin, USER_ROLE.manager),
    validateRequest(CategoryValidations.updateCategoryValidationSchema),
    CategoryControllers.updateCategory
);

router.delete(
    '/:id',
    auth(USER_ROLE.admin),
    CategoryControllers.deleteCategory
);

export const categoryRoutes = router;

