import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CustomerServices } from './customer.service';

const createCustomer = catchAsync(async (req, res) => {
    const result = await CustomerServices.createCustomer(req.body, req.user._id);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Customer created successfully',
        data: result,
    });
});

const getCustomers = catchAsync(async (req, res) => {
    const result = await CustomerServices.getCustomers(req.query);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Customers retrieved successfully',
        data: result,
    });
});

const getCustomer = catchAsync(async (req, res) => {
    const result = await CustomerServices.getCustomer(req.params.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Customer retrieved successfully',
        data: result,
    });
});

const updateCustomer = catchAsync(async (req, res) => {
    const result = await CustomerServices.updateCustomer(req.params.id, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Customer updated successfully',
        data: result,
    });
});

const deleteCustomer = catchAsync(async (req, res) => {
    await CustomerServices.deleteCustomer(req.params.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Customer deleted successfully',
        data: null,
    });
});

export const CustomerControllers = {
    createCustomer,
    getCustomers,
    getCustomer,
    updateCustomer,
    deleteCustomer,
};
