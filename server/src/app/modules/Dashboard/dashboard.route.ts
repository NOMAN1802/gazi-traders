import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLE } from "../User/user.constant";
import { DashboardControllers } from "./dashboard.controller";

const router = express.Router();

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  DashboardControllers.getDashboard
);

export const dashboardRoutes = router;
