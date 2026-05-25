import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { RefundControllers } from "./refund.controller";
import { RefundValidations } from "./refund.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(RefundValidations.createRefundValidationSchema),
  RefundControllers.createRefund
);

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  RefundControllers.getAllRefunds
);

router.get(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  RefundControllers.getRefundById
);

router.patch(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(RefundValidations.updateRefundValidationSchema),
  RefundControllers.updateRefund
);

router.delete("/:id", auth(USER_ROLE.admin), RefundControllers.deleteRefund);

export const refundRoutes = router;

