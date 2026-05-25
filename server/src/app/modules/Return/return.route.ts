import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { ReturnControllers } from "./return.controller";
import { ReturnValidations } from "./return.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(ReturnValidations.createReturnValidationSchema),
  ReturnControllers.createReturn
);

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  ReturnControllers.getAllReturns
);

router.get(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  ReturnControllers.getReturnById
);

router.patch(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(ReturnValidations.updateReturnValidationSchema),
  ReturnControllers.updateReturn
);

router.delete("/:id", auth(USER_ROLE.admin), ReturnControllers.deleteReturn);

export const returnRoutes = router;
