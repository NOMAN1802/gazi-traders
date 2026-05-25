import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { OrderControllers } from "./order.controller";
import { OrderValidations } from "./order.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(OrderValidations.createOrderValidationSchema),
  OrderControllers.createOrder
);

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  OrderControllers.getAllOrders
);

router.get(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  OrderControllers.getOrderById
);

router.patch(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(OrderValidations.updateOrderValidationSchema),
  OrderControllers.updateOrder
);

router.delete("/:id", auth(USER_ROLE.admin), OrderControllers.deleteOrder);

export const orderRoutes = router;
