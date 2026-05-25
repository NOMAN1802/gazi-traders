import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { DamageServices } from "./damage.service";

const createDamage = catchAsync(async (req, res) => {
  const result = await DamageServices.createDamage(req.body, req.user._id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Damage entry created successfully",
    data: result,
  });
});

const getAllDamages = catchAsync(async (req, res) => {
  const result = await DamageServices.getAllDamages(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Damages retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getDamageById = catchAsync(async (req, res) => {
  const result = await DamageServices.getDamageById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Damage entry retrieved successfully",
    data: result,
  });
});

const updateDamage = catchAsync(async (req, res) => {
  const result = await DamageServices.updateDamage(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Damage entry updated successfully",
    data: result,
  });
});

const deleteDamage = catchAsync(async (req, res) => {
  const result = await DamageServices.deleteDamage(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Damage entry deleted successfully",
    data: result,
  });
});

export const DamageControllers = {
  createDamage,
  getAllDamages,
  getDamageById,
  updateDamage,
  deleteDamage,
};
