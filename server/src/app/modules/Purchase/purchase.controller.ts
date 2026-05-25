import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PurchaseServices } from "./purchase.service";

const createPurchase = catchAsync(async (req, res) => {
  const result = await PurchaseServices.createPurchase(req.body, req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Purchase created successfully",
    data: result,
  });
});

const getAllPurchases = catchAsync(async (req, res) => {
  const result = await PurchaseServices.getAllPurchases(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchases retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getPurchaseById = catchAsync(async (req, res) => {
  const result = await PurchaseServices.getPurchaseById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase retrieved successfully",
    data: result,
  });
});

const updatePurchase = catchAsync(async (req, res) => {
  const result = await PurchaseServices.updatePurchase(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase updated successfully",
    data: result,
  });
});

const deletePurchase = catchAsync(async (req, res) => {
  const result = await PurchaseServices.deletePurchase(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase deleted successfully",
    data: result,
  });
});

export const PurchaseControllers = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
};

