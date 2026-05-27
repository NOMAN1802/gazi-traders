import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLE } from "../User/user.constant";
import { ReportsControllers } from "./reports.controller";

const router = express.Router();

router.get(
  "/stock",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ReportsControllers.getStockReport
);

router.get(
  "/orders",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ReportsControllers.getOrderReport
);

router.get(
  "/damages",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ReportsControllers.getDamageReport
);

router.get(
  "/returns",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ReportsControllers.getReturnReport
);

router.get(
  "/expenses",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ReportsControllers.getExpenseReport
);

router.get(
  "/revenue",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ReportsControllers.getRevenueReport
);

router.get(
  "/financial-summary",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ReportsControllers.getFinancialSummary
);

router.get(
  "/daily-stock",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  ReportsControllers.getDailyStock
);

export const reportsRoutes = router;
