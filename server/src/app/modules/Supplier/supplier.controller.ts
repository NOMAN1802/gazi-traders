import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupplierServices } from './supplier.service';

const createSupplier = catchAsync(async (req, res) => {
    const result = await SupplierServices.createSupplier(req.body, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Supplier created successfully',
        data: result,
    });
});

const getSuppliers = catchAsync(async (req, res) => {
    const result = await SupplierServices.getSuppliers(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Suppliers retrieved successfully',
        data: result,
    });
});

const getSupplier = catchAsync(async (req, res) => {
    const result = await SupplierServices.getSupplier(req.params.id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Supplier retrieved successfully',
        data: result,
    });
});

const updateSupplier = catchAsync(async (req, res) => {
    const result = await SupplierServices.updateSupplier(req.params.id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Supplier updated successfully',
        data: result,
    });
});

const deleteSupplier = catchAsync(async (req, res) => {
    await SupplierServices.deleteSupplier(req.params.id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Supplier deleted successfully',
        data: null,
    });
});

export const SupplierControllers = {
    createSupplier,
    getSuppliers,
    getSupplier,
    updateSupplier,
    deleteSupplier,
};

