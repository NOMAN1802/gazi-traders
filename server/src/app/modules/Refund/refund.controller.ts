import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { RefundServices } from "./refund.service";

const createRefund = catchAsync(async (req, res) => {
  const result = await RefundServices.createRefund(req.body, req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Refund entry created successfully",
    data: result,
  });
});

const getAllRefunds = catchAsync(async (req, res) => {
  const result = await RefundServices.getAllRefunds(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Refunds retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getRefundById = catchAsync(async (req, res) => {
  const result = await RefundServices.getRefundById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Refund entry retrieved successfully",
    data: result,
  });
});

const updateRefund = catchAsync(async (req, res) => {
  const result = await RefundServices.updateRefund(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Refund entry updated successfully",
    data: result,
  });
});

const deleteRefund = catchAsync(async (req, res) => {
  const result = await RefundServices.deleteRefund(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Refund entry deleted successfully",
    data: result,
  });
});

export const RefundControllers = {
  createRefund,
  getAllRefunds,
  getRefundById,
  updateRefund,
  deleteRefund,
};

