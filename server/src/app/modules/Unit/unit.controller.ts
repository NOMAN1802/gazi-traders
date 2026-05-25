import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UnitServices } from './unit.service';

const createUnit = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const unit = await UnitServices.createUnit(req.body, userId);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Unit created successfully',
        data: unit,
    });
});

const getUnits = catchAsync(async (req: Request, res: Response) => {
    const result = await UnitServices.getUnits(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Units retrieved successfully',
        data: result,
    });
});

const getUnit = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const unit = await UnitServices.getUnit(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Unit retrieved successfully',
        data: unit,
    });
});

const updateUnit = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const unit = await UnitServices.updateUnit(id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Unit updated successfully',
        data: unit,
    });
});

const deleteUnit = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await UnitServices.deleteUnit(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Unit deleted successfully',
        data: null,
    });
});

export const UnitControllers = {
    createUnit,
    getUnits,
    getUnit,
    updateUnit,
    deleteUnit,
};

