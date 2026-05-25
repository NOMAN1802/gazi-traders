import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.service';

const createProduct = catchAsync(async (req, res) => {
  const product = await ProductServices.createProduct({
    ...req.body,
    createdBy: req.user?._id,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product processed successfully',
    data: product,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const result = await ProductServices.updateProduct(req.params.id, req.body);

  if (!result) {
    throw new AppError(404, 'Product not found');
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product updated successfully',
    data: result,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const result = await ProductServices.deleteProduct(req.params.id);

  if (!result) {
    throw new AppError(404, 'Product not found');
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product deleted successfully',
    data: result,
  });
});

const getProduct = catchAsync(async (req, res) => {
  const result = await ProductServices.getProduct(req.params.id);

  if (!result) {
    throw new AppError(404, 'Product not found');
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product retrieved successfully',
    data: result,
  });
});

const getProducts = catchAsync(async (req, res) => {
  const query = { ...req.query };
  const result = await ProductServices.getProducts(query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Products retrieved successfully',
    data: result,
  });
});

export const ProductControllers = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getProducts,
};
