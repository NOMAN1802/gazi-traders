import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ReturnServices } from "./return.service";

const createReturn = catchAsync(async (req, res) => {
  const result = await ReturnServices.createReturn(req.body, req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Return entry created successfully",
    data: result,
  });
});

const getAllReturns = catchAsync(async (req, res) => {
  const result = await ReturnServices.getAllReturns(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Returns retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getReturnById = catchAsync(async (req, res) => {
  const result = await ReturnServices.getReturnById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Return entry retrieved successfully",
    data: result,
  });
});

const updateReturn = catchAsync(async (req, res) => {
  const result = await ReturnServices.updateReturn(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Return entry updated successfully",
    data: result,
  });
});

const deleteReturn = catchAsync(async (req, res) => {
  const result = await ReturnServices.deleteReturn(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Return entry deleted successfully",
    data: result,
  });
});

export const ReturnControllers = {
  createReturn,
  getAllReturns,
  getReturnById,
  updateReturn,
  deleteReturn,
};
