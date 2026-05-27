import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { StockIntakeServices } from './stock-intake.service';

const createStockIntake = catchAsync(async (req, res) => {
  const result = await StockIntakeServices.createStockIntake(req.body, req.user._id);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Stock intake recorded', data: result });
});

const getAllStockIntakes = catchAsync(async (req, res) => {
  const result = await StockIntakeServices.getAllStockIntakes(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Stock intakes retrieved', meta: result.meta, data: result.result });
});

const getStockIntakeById = catchAsync(async (req, res) => {
  const result = await StockIntakeServices.getStockIntakeById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Stock intake retrieved', data: result });
});

export const StockIntakeControllers = { createStockIntake, getAllStockIntakes, getStockIntakeById };
