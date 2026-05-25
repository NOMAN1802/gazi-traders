import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { ExpenseControllers } from "./expense.controller";
import { ExpenseValidations } from "./expense.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(ExpenseValidations.createExpenseValidationSchema),
  ExpenseControllers.createExpense
);

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ExpenseControllers.getAllExpenses
);

router.get(
  "/summary",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ExpenseControllers.getExpenseSummary
);

router.get(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  ExpenseControllers.getExpenseById
);

router.patch(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.manager),
  validateRequest(ExpenseValidations.updateExpenseValidationSchema),
  ExpenseControllers.updateExpense
);

router.delete("/:id", auth(USER_ROLE.admin), ExpenseControllers.deleteExpense);

export const expenseRoutes = router;
