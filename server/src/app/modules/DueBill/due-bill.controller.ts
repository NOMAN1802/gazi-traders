import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DueBillServices } from './due-bill.service';

const createDueBill = catchAsync(async (req, res) => {
  const result = await DueBillServices.createDueBill(req.body, req.user._id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Due bill created successfully',
    data: result,
  });
});

const getAllDueBills = catchAsync(async (req, res) => {
  const result = await DueBillServices.getAllDueBills(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Due bills retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getDueBillById = catchAsync(async (req, res) => {
  const result = await DueBillServices.getDueBillById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Due bill retrieved successfully',
    data: result,
  });
});

const updateDueBill = catchAsync(async (req, res) => {
  const result = await DueBillServices.updateDueBill(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Due bill updated successfully',
    data: result,
  });
});

const payDueBill = catchAsync(async (req, res) => {
  const result = await DueBillServices.payDueBill(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment recorded successfully',
    data: result,
  });
});

const deleteDueBill = catchAsync(async (req, res) => {
  const result = await DueBillServices.deleteDueBill(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Due bill deleted successfully',
    data: result,
  });
});

export const DueBillControllers = {
  createDueBill,
  getAllDueBills,
  getDueBillById,
  updateDueBill,
  payDueBill,
  deleteDueBill,
};
