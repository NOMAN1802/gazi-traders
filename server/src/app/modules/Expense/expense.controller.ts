import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ExpenseServices } from "./expense.service";

const createExpense = catchAsync(async (req, res) => {
  const result = await ExpenseServices.createExpense(req.body, req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Expense created successfully",
    data: result,
  });
});

const getAllExpenses = catchAsync(async (req, res) => {
  const result = await ExpenseServices.getAllExpenses(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expenses retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getExpenseById = catchAsync(async (req, res) => {
  const result = await ExpenseServices.getExpenseById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense retrieved successfully",
    data: result,
  });
});

const updateExpense = catchAsync(async (req, res) => {
  const result = await ExpenseServices.updateExpense(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense updated successfully",
    data: result,
  });
});

const deleteExpense = catchAsync(async (req, res) => {
  const result = await ExpenseServices.deleteExpense(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense deleted successfully",
    data: result,
  });
});

const getExpenseSummary = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await ExpenseServices.getExpenseSummary(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense summary retrieved successfully",
    data: result,
  });
});

export const ExpenseControllers = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
