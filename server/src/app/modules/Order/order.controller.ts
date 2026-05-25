import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { OrderServices } from "./order.service";

const createOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.createOrder(req.body, req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Order created successfully",
    data: result,
  });
});

const getAllOrders = catchAsync(async (req, res) => {
  const result = await OrderServices.getAllOrders(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Orders retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getOrderById = catchAsync(async (req, res) => {
  const result = await OrderServices.getOrderById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order retrieved successfully",
    data: result,
  });
});

const updateOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.updateOrder(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order updated successfully",
    data: result,
  });
});

const deleteOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.deleteOrder(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order deleted successfully",
    data: result,
  });
});

export const OrderControllers = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
};
