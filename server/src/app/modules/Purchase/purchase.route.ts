import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { PurchaseControllers } from "./purchase.controller";
import { PurchaseValidations } from "./purchase.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(PurchaseValidations.createPurchaseValidationSchema),
  PurchaseControllers.createPurchase
);

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  PurchaseControllers.getAllPurchases
);

router.get(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  PurchaseControllers.getPurchaseById
);

router.patch(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(PurchaseValidations.updatePurchaseValidationSchema),
  PurchaseControllers.updatePurchase
);

router.delete("/:id", auth(USER_ROLE.admin), PurchaseControllers.deletePurchase);

export const purchaseRoutes = router;

