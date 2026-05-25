import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PendingProductServices } from './pending-product.service';

const createPendingProducts = catchAsync(async (req, res) => {
  const result = await PendingProductServices.createPendingProducts(
    req.body.items,
    req.user._id
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Pending products created successfully',
    data: result,
  });
});

const getAllPendingProducts = catchAsync(async (req, res) => {
  const result = await PendingProductServices.getAllPendingProducts(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending products retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const updatePendingProduct = catchAsync(async (req, res) => {
  const result = await PendingProductServices.updatePendingProduct(
    req.params.id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending product updated successfully',
    data: result,
  });
});

const deletePendingProduct = catchAsync(async (req, res) => {
  await PendingProductServices.deletePendingProduct(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending product deleted successfully',
    data: null,
  });
});

const getPendingProductStats = catchAsync(async (req, res) => {
  const result = await PendingProductServices.getPendingProductStats(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending product stats retrieved successfully',
    data: result,
  });
});

export const PendingProductControllers = {
  createPendingProducts,
  getAllPendingProducts,
  getPendingProductStats,
  updatePendingProduct,
  deletePendingProduct,
};
