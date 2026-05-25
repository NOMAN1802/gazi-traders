import httpStatus from "http-status";
import mongoose from "mongoose";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { TRefund } from "./refund.interface";
import { Refund } from "./refund.model";
import { Order } from "../Order/order.model";

const createRefund = async (payload: TRefund, userId: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Link Order if orderNumber is provided
    if (payload.orderNumber) {
      const order = await Order.findOne({ orderNumber: payload.orderNumber }).session(session);
      if (order) {
        payload.order = order._id as any;
        payload.orderId = order._id as any;
        // Ensure orderNumber is set
        if (!payload.orderNumber) {
          payload.orderNumber = order.orderNumber;
        }
      }
    }

    // Link Order if orderId is provided directly
    if (payload.orderId && !payload.order) {
      const order = await Order.findById(payload.orderId).session(session);
      if (order) {
        payload.order = order._id as any;
        payload.orderId = order._id as any;
        // Set orderNumber from the order
        payload.orderNumber = order.orderNumber;
      }
    }

    // If order is provided as ObjectId but orderNumber is missing, fetch it
    if (payload.order && !payload.orderNumber) {
      const order = await Order.findById(payload.order).session(session);
      if (order) {
        payload.orderNumber = order.orderNumber;
        payload.orderId = order._id as any;
      }
    }

    // Create refund entry
    payload.createdBy = new mongoose.Types.ObjectId(userId);
    const result = await Refund.create([payload], { session });

    await session.commitTransaction();
    await session.endSession();

    // Populate order before returning
    const populatedRefund = await Refund.findById(result[0]._id)
      .populate("order")
      .populate("createdBy", "name email");

    return populatedRefund || result[0];
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

const getAllRefunds = async (query: Record<string, unknown>) => {
  const refundQuery = new QueryBuilder(
    Refund.find({ isDeleted: { $ne: true } })
      .populate("order")
      .populate("createdBy", "name email"),
    query
  )
    .search(["refundNumber", "customer.name", "orderNumber"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await refundQuery.modelQuery;
  const meta = await refundQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getRefundById = async (id: string) => {
  const result = await Refund.findById(id)
    .populate("order")
    .populate("createdBy", "name email");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Refund entry not found");
  }

  return result;
};

const updateRefund = async (id: string, payload: Partial<TRefund>) => {
  const refundEntry = await Refund.findById(id);

  if (!refundEntry) {
    throw new AppError(httpStatus.NOT_FOUND, "Refund entry not found");
  }

  if (refundEntry.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot update a deleted refund");
  }

  const result = await Refund.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteRefund = async (id: string) => {
  const refundEntry = await Refund.findById(id);

  if (!refundEntry) {
    throw new AppError(httpStatus.NOT_FOUND, "Refund entry not found");
  }

  if (!refundEntry.isDeleted) {
    // Soft delete
    await Refund.findByIdAndUpdate(id, { isDeleted: true });
  }

  return refundEntry;
};

export const RefundServices = {
  createRefund,
  getAllRefunds,
  getRefundById,
  updateRefund,
  deleteRefund,
};

