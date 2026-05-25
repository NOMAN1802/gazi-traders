import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { DamageControllers } from "./damage.controller";
import { DamageValidations } from "./damage.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  validateRequest(DamageValidations.createDamageValidationSchema),
  DamageControllers.createDamage
);

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  DamageControllers.getAllDamages
);

router.get(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.staff),
  DamageControllers.getDamageById
);

router.patch(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(DamageValidations.updateDamageValidationSchema),
  DamageControllers.updateDamage
);

router.delete("/:id", auth(USER_ROLE.admin), DamageControllers.deleteDamage);

export const damageRoutes = router;
