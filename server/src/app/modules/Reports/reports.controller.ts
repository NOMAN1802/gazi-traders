import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ReportsServices } from "./reports.service";

const getStockReport = catchAsync(async (req, res) => {
  const result = await ReportsServices.getStockReport();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock report retrieved successfully",
    data: result,
  });
});

const getOrderReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await ReportsServices.getOrderReport(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order report retrieved successfully",
    data: result,
  });
});

const getDamageReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await ReportsServices.getDamageReport(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Damage report retrieved successfully",
    data: result,
  });
});

const getReturnReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await ReportsServices.getReturnReport(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Return report retrieved successfully",
    data: result,
  });
});

const getExpenseReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await ReportsServices.getExpenseReport(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Expense report retrieved successfully",
    data: result,
  });
});

const getRevenueReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await ReportsServices.getRevenueReport(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Revenue report retrieved successfully",
    data: result,
  });
});

const getFinancialSummary = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await ReportsServices.getFinancialSummary(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Financial summary retrieved successfully",
    data: result,
  });
});

const getDailyStock = catchAsync(async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const result = await ReportsServices.getDailyStock(date);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Daily stock retrieved successfully',
    data: result,
  });
});

export const ReportsControllers = {
  getStockReport,
  getOrderReport,
  getDamageReport,
  getReturnReport,
  getExpenseReport,
  getRevenueReport,
  getFinancialSummary,
  getDailyStock,
};
